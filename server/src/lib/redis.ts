import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "./logger";

/**
 * Redis is optional. Without REDIS_URL the app still works: caching is skipped,
 * rate limits are kept in memory and background jobs run in-process.
 */
let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!env.REDIS_URL) return null;
  if (!client) {
    client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: false });
    client.on("error", (err) => logger.warn({ err: err.message }, "Redis error"));
    client.on("ready", () => logger.info("Redis connected"));
  }
  return client;
}

export function redisReady(): boolean {
  return client?.status === "ready";
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => undefined);
    client = null;
  }
}
