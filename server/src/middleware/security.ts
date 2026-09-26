import type { NextFunction, Request, Response } from "express";
import rateLimit, { type Options } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { env } from "../config/env";
import { getRedis } from "../lib/redis";
import { forbidden } from "../lib/errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence: state-changing API calls must carry a custom header. Browsers
 * can't add custom headers to cross-site requests without a CORS preflight,
 * which our CORS policy only allows for the app's own origin.
 */
export function requireCsrfHeader(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method) || req.get("x-requested-with") === "klyro") return next();
  throw forbidden("Missing X-Requested-With header");
}

function limiter(name: string, options: Partial<Options>) {
  const redis = getRedis();
  return rateLimit({
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => env.isTest,
    message: { success: false, statusCode: 429, code: "RATE_LIMITED", message: "Too many requests, please slow down" },
    ...(redis
      ? {
          store: new RedisStore({
            prefix: `rl:${name}:`,
            sendCommand: (...args: string[]) =>
              redis.call(args[0] as string, ...args.slice(1)) as Promise<never>,
          }),
        }
      : {}),
    ...options,
  });
}

export const apiLimiter = limiter("api", { windowMs: 60_000, limit: env.isProd ? 300 : 5000 });
export const authLimiter = limiter("auth", { windowMs: 15 * 60_000, limit: env.isProd ? 20 : 500 });
export const writeLimiter = limiter("write", { windowMs: 60_000, limit: 30, skip: (req) => env.isTest || SAFE_METHODS.has(req.method) });
export const aiLimiter = limiter("ai", { windowMs: 60 * 60_000, limit: 30 });
