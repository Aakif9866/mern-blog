import type { Request, Response } from "express";
import * as auth from "../services/auth.service";
import { body } from "../middleware/validate";
import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from "../lib/cookies";
import { unauthorized } from "../lib/errors";
import { env } from "../config/env";

export const clientMeta = (req: Request): auth.ClientMeta => ({ ip: req.ip ?? "", userAgent: req.get("user-agent") ?? "" });

function signedIn(res: Response, result: { user: Parameters<typeof auth.serializeMe>[0]; accessToken: string; refreshToken: string }, status = 200) {
  setAuthCookies(res, result.accessToken, result.refreshToken);
  res.status(status).json({ user: auth.serializeMe(result.user) });
}

export async function register(req: Request, res: Response) {
  signedIn(res, await auth.register(body(req), clientMeta(req)), 201);
}

export async function login(req: Request, res: Response) {
  const { identifier, password } = body<{ identifier: string; password: string }>(req);
  signedIn(res, await auth.login(identifier, password, clientMeta(req)));
}

export async function google(req: Request, res: Response) {
  signedIn(res, await auth.googleLogin(body<{ credential: string }>(req).credential, clientMeta(req)));
}

export async function guest(req: Request, res: Response) {
  signedIn(res, await auth.createGuest(clientMeta(req)), 201);
}

export async function upgradeGuest(req: Request, res: Response) {
  const user = await auth.upgradeGuest(req.user!, body(req));
  res.json({ user: auth.serializeMe(user) });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) throw unauthorized("Session expired");
  try {
    signedIn(res, await auth.refresh(token, clientMeta(req)));
  } catch (err) {
    clearAuthCookies(res);
    throw err;
  }
}

export async function logout(req: Request, res: Response) {
  await auth.logout(req.cookies?.[REFRESH_COOKIE]);
  clearAuthCookies(res);
  res.json({ ok: true });
}

export async function logoutAll(req: Request, res: Response) {
  await auth.logoutAll(req.user!._id);
  clearAuthCookies(res);
  res.json({ ok: true });
}

/**
 * Session probe for app start-up. Always 200: the signed-in user, a user
 * restored from the refresh cookie (rotating it), or null for guests.
 */
export async function session(req: Request, res: Response) {
  if (req.user) return res.json({ user: auth.serializeMe(req.user) });
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (token) {
    try {
      const result = await auth.refresh(token, clientMeta(req));
      setAuthCookies(res, result.accessToken, result.refreshToken);
      return res.json({ user: auth.serializeMe(result.user) });
    } catch {
      clearAuthCookies(res);
    }
  }
  res.json({ user: null });
}

export function me(req: Request, res: Response) {
  res.json({ user: auth.serializeMe(req.user!) });
}

export async function sessions(req: Request, res: Response) {
  res.json({ items: await auth.listSessions(req.user!._id, req.cookies?.[REFRESH_COOKIE]) });
}

export async function revokeSession(req: Request, res: Response) {
  await auth.revokeSession(req.user!._id, req.params.id as string);
  res.json({ ok: true });
}

export async function verifyEmail(req: Request, res: Response) {
  const user = await auth.verifyEmail(body<{ token: string }>(req).token);
  res.json({ user: auth.serializeMe(user) });
}

export async function resendVerification(req: Request, res: Response) {
  await auth.sendVerificationEmail(req.user!);
  res.json({ ok: true });
}

export async function forgotPassword(req: Request, res: Response) {
  await auth.forgotPassword(body<{ email: string }>(req).email);
  res.json({ ok: true, message: "If that email has an account, a reset link is on its way." });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = body<{ token: string; password: string }>(req);
  await auth.resetPassword(token, password);
  clearAuthCookies(res);
  res.json({ ok: true });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = body<{ currentPassword?: string; newPassword: string }>(req);
  await auth.changePassword(req.user!._id, currentPassword, newPassword);
  res.json({ ok: true });
}

export function config(_req: Request, res: Response) {
  res.json({ googleClientId: env.GOOGLE_CLIENT_ID ?? null, aiEnabled: env.aiEnabled });
}
