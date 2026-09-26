import type { NextFunction, Request, Response } from "express";
import { User, type Role } from "../models/User";
import { ACCESS_COOKIE } from "../lib/cookies";
import { verifyAccessToken } from "../lib/tokens";
import { forbidden, unauthorized } from "../lib/errors";

const ROLE_RANK: Record<Role, number> = { user: 0, moderator: 1, admin: 2 };

export function hasRole(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

async function loadUser(req: Request) {
  const token = req.cookies?.[ACCESS_COOKIE] as string | undefined;
  if (!token) return null;
  const payload = verifyAccessToken(token);
  if (!payload) return null;
  const user = await User.findById(payload.sub);
  // tokenVersion is bumped on "log out everywhere" and password resets.
  if (!user || user.tokenVersion !== payload.tv) return null;
  if (user.status === "suspended" && user.suspendedUntil && user.suspendedUntil <= new Date()) {
    user.status = "active";
    user.suspendedUntil = null;
    await user.save();
  }
  return user;
}

/** Attaches req.user when a valid session exists; never rejects. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const user = await loadUser(req);
  if (user && user.status !== "banned") req.user = user;
  next();
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const user = req.user ?? (await loadUser(req));
  if (!user) throw unauthorized();
  if (user.status === "banned") throw forbidden("This account has been banned");
  req.user = user;
  next();
}

/** Blocks write actions for suspended users and users with unverified email. */
export function requireActiveUser(req: Request, _res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) throw unauthorized();
  if (user.status === "suspended") {
    const until = user.suspendedUntil ? ` until ${user.suspendedUntil.toISOString().slice(0, 10)}` : "";
    throw forbidden(`Your account is suspended${until}`);
  }
  if (!user.emailVerified) throw forbidden("Please verify your email address first");
  next();
}

export function requireRole(min: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw unauthorized();
    if (!hasRole(req.user.role, min)) throw forbidden();
    next();
  };
}
