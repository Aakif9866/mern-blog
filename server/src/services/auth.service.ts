import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import type { Types } from "mongoose";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";
import { User, type UserDoc } from "../models/User";
import { Session } from "../models/Session";
import { AuthToken, type AuthTokenType } from "../models/AuthToken";
import { AppError, badRequest, conflict, forbidden, unauthorized } from "../lib/errors";
import { hashToken, randomToken, signAccessToken } from "../lib/tokens";
import { enqueue } from "../lib/queue";
import { verifyEmailMail, resetPasswordMail } from "../lib/emails";
import { slugify } from "../lib/text";

export interface ClientMeta {
  ip: string;
  userAgent: string;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

type Id = Types.ObjectId | string;

const BCRYPT_ROUNDS = 12;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

/** The signed-in user's own view of their account. */
export function serializeMe(user: UserDoc) {
  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    name: user.name,
    bio: user.bio,
    avatar: user.avatar,
    website: user.website,
    location: user.location,
    role: user.role,
    status: user.status,
    suspendedUntil: user.suspendedUntil ?? null,
    emailVerified: user.emailVerified,
    onboarded: user.onboarded,
    followedTags: user.followedTags,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    postsCount: user.postsCount,
    emailPrefs: user.emailPrefs,
    googleLinked: Boolean(user.googleId),
    createdAt: user.createdAt,
  };
}

async function issueSession(user: UserDoc, meta: ClientMeta, family: string = randomUUID()): Promise<IssuedTokens & { sessionId: string }> {
  const refreshToken = randomToken();
  const session = await Session.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    family,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    userAgent: meta.userAgent.slice(0, 300),
    ip: meta.ip,
  });
  const accessToken = signAccessToken({ sub: String(user._id), role: user.role, tv: user.tokenVersion });
  return { accessToken, refreshToken, sessionId: String(session._id) };
}

async function createAuthToken(userId: Id, type: AuthTokenType, ttlMs: number): Promise<string> {
  await AuthToken.deleteMany({ user: userId, type, usedAt: null });
  const token = randomToken(32);
  await AuthToken.create({ user: userId, type, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) });
  return token;
}

async function consumeAuthToken(token: string, type: AuthTokenType) {
  const record = await AuthToken.findOne({ tokenHash: hashToken(token), type, usedAt: null, expiresAt: { $gt: new Date() } });
  if (!record) throw badRequest("This link is invalid or has expired");
  record.usedAt = new Date();
  await record.save();
  return record;
}

export async function sendVerificationEmail(user: UserDoc): Promise<void> {
  if (user.emailVerified) return;
  const token = await createAuthToken(user._id, "verify_email", VERIFY_TTL_MS);
  await enqueue("email", verifyEmailMail(user.email, user.name || user.username, token));
}

async function uniqueUsername(seed: string): Promise<string> {
  const base = slugify(seed, 20).replace(/-/g, "") || "writer";
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}${Math.floor(Math.random() * 10_000)}`;
    if (candidate.length >= 3 && !(await User.exists({ username: candidate }))) return candidate;
  }
  return `${base}${Date.now().toString(36)}`;
}

export async function register(
  input: { username: string; email: string; password: string; name?: string },
  meta: ClientMeta
) {
  const [emailTaken, usernameTaken] = await Promise.all([
    User.exists({ email: input.email.toLowerCase() }),
    User.exists({ username: input.username.toLowerCase() }),
  ]);
  if (emailTaken) throw conflict("An account with that email already exists");
  if (usernameTaken) throw conflict("That username is taken");

  const user = await User.create({
    username: input.username,
    email: input.email,
    name: input.name || input.username,
    password: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
  });
  await sendVerificationEmail(user);
  const tokens = await issueSession(user, meta);
  return { user, ...tokens };
}

let dummyHash: string | null = null;

export async function login(identifier: string, password: string, meta: ClientMeta) {
  const id = identifier.toLowerCase().trim();
  const user = await User.findOne(id.includes("@") ? { email: id } : { username: id }).select("+password");
  // Compare against a dummy hash when the user doesn't exist, so response time doesn't leak which emails are registered.
  dummyHash ??= await bcrypt.hash("not-a-real-password", BCRYPT_ROUNDS);
  const hash = user?.password ?? dummyHash;
  const ok = await bcrypt.compare(password, hash);
  if (!user || !user.password || !ok) throw unauthorized("Invalid email/username or password");
  if (user.status === "banned") throw forbidden("This account has been banned");
  const tokens = await issueSession(user, meta);
  return { user, ...tokens };
}

let googleClient: OAuth2Client | null = null;

/** Signs in with a Google ID token, verified server-side against GOOGLE_CLIENT_ID. */
export async function googleLogin(credential: string, meta: ClientMeta) {
  if (!env.GOOGLE_CLIENT_ID) throw new AppError(501, "Google sign-in is not configured", "NOT_CONFIGURED");
  googleClient ??= new OAuth2Client(env.GOOGLE_CLIENT_ID);
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw unauthorized("Google sign-in failed");
  }
  if (!payload?.email || !payload.email_verified || !payload.sub) throw unauthorized("Google account email is not verified");

  let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }] });
  if (!user) {
    user = await User.create({
      username: await uniqueUsername(payload.name ?? payload.email.split("@")[0] ?? "writer"),
      email: payload.email,
      name: payload.name ?? "",
      avatar: payload.picture ?? "",
      googleId: payload.sub,
      emailVerified: true,
    });
  } else {
    if (user.status === "banned") throw forbidden("This account has been banned");
    let changed = false;
    if (!user.googleId) {
      user.googleId = payload.sub;
      changed = true;
    }
    if (!user.emailVerified) {
      user.emailVerified = true; // Google verified the address
      changed = true;
    }
    if (changed) await user.save();
  }
  const tokens = await issueSession(user, meta);
  return { user, ...tokens };
}

/**
 * Rotates a refresh token. Presenting a token that was already rotated means
 * it was stolen or replayed, so the whole login family is revoked.
 */
export async function refresh(refreshToken: string, meta: ClientMeta) {
  const session = await Session.findOne({ tokenHash: hashToken(refreshToken) });
  if (!session || session.expiresAt <= new Date()) throw unauthorized("Session expired");

  if (session.revokedAt) {
    if (session.replacedBy) {
      await Session.updateMany({ family: session.family, revokedAt: null }, { revokedAt: new Date() });
    }
    throw unauthorized("Session expired");
  }

  const user = await User.findById(session.user);
  if (!user || user.status === "banned") {
    session.revokedAt = new Date();
    await session.save();
    throw unauthorized("Session expired");
  }

  const next = await issueSession(user, meta, session.family);
  session.revokedAt = new Date();
  session.replacedBy = next.sessionId as never;
  session.lastUsedAt = new Date();
  await session.save();
  return { user, accessToken: next.accessToken, refreshToken: next.refreshToken };
}

export async function logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  await Session.updateOne({ tokenHash: hashToken(refreshToken), revokedAt: null }, { revokedAt: new Date() });
}

/** Revokes every refresh token and invalidates outstanding access tokens. */
export async function logoutAll(userId: Id): Promise<void> {
  await Session.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
}

export async function listSessions(userId: Id, currentRefresh?: string) {
  const currentHash = currentRefresh ? hashToken(currentRefresh) : null;
  const sessions = await Session.find({ user: userId, revokedAt: null, expiresAt: { $gt: new Date() } })
    .select("tokenHash userAgent ip createdAt lastUsedAt")
    .sort({ lastUsedAt: -1 })
    .lean();
  return sessions.map((s) => ({
    _id: s._id,
    userAgent: s.userAgent,
    ip: s.ip,
    createdAt: s.createdAt,
    lastUsedAt: s.lastUsedAt,
    current: s.tokenHash === currentHash,
  }));
}

export async function revokeSession(userId: Id, sessionId: string): Promise<void> {
  await Session.updateOne({ _id: sessionId, user: userId }, { revokedAt: new Date() });
}

export async function verifyEmail(token: string) {
  const record = await consumeAuthToken(token, "verify_email");
  const user = await User.findByIdAndUpdate(record.user, { emailVerified: true }, { returnDocument: "after" });
  if (!user) throw badRequest("This link is invalid or has expired");
  return user;
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase() });
  // Always succeed, so the endpoint can't be used to discover accounts.
  if (!user || user.status === "banned") return;
  const token = await createAuthToken(user._id, "reset_password", RESET_TTL_MS);
  await enqueue("email", resetPasswordMail(user.email, token));
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const record = await consumeAuthToken(token, "reset_password");
  await User.updateOne(
    { _id: record.user },
    { password: await bcrypt.hash(password, BCRYPT_ROUNDS), emailVerified: true, $inc: { tokenVersion: 1 } }
  );
  await Session.updateMany({ user: record.user, revokedAt: null }, { revokedAt: new Date() });
}

export async function changePassword(userId: Id, current: string | undefined, next: string): Promise<void> {
  const user = await User.findById(userId).select("+password");
  if (!user) throw unauthorized();
  if (user.password) {
    if (!current || !(await bcrypt.compare(current, user.password))) throw badRequest("Current password is incorrect");
  }
  user.password = await bcrypt.hash(next, BCRYPT_ROUNDS);
  await user.save();
}

export async function checkPassword(userId: Id, password: string | undefined): Promise<boolean> {
  const user = await User.findById(userId).select("+password");
  if (!user) return false;
  if (!user.password) return true; // Google-only accounts have no password to confirm
  return Boolean(password) && bcrypt.compare(password as string, user.password);
}
