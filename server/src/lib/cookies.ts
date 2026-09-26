import type { CookieOptions, Response } from "express";
import { env } from "../config/env";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";
const REFRESH_PATH = "/api/auth";

function base(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, { ...base(), path: "/", maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...base(),
    path: REFRESH_PATH,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...base(), path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...base(), path: REFRESH_PATH });
}
