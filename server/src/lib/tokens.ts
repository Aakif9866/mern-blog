import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "../models/User";

export interface AccessPayload {
  sub: string;
  role: Role;
  tv: number;
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.accessSecret, { expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string): AccessPayload | null {
  try {
    const decoded = jwt.verify(token, env.accessSecret);
    if (typeof decoded === "string" || typeof decoded.sub !== "string") return null;
    return { sub: decoded.sub, role: decoded.role as Role, tv: Number(decoded.tv ?? 0) };
  } catch {
    return null;
  }
}

export function randomToken(bytes = 48): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
