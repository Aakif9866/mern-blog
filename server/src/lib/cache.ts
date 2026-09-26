import { getRedis, redisReady } from "./redis";
import { logger } from "./logger";

/** Thin JSON cache over Redis that silently does nothing when Redis is unavailable. */
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const redis = getRedis();
    if (!redis || !redisReady()) return null;
    try {
      const raw = await redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      logger.debug({ err, key }, "cache get failed");
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const redis = getRedis();
    if (!redis || !redisReady()) return;
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds).catch(() => undefined);
  },

  async del(...keys: string[]): Promise<void> {
    const redis = getRedis();
    if (!redis || !redisReady() || keys.length === 0) return;
    await redis.del(...keys).catch(() => undefined);
  },

  /** Deletes every key with the given prefix. Only used for small key sets (feeds). */
  async delPrefix(prefix: string): Promise<void> {
    const redis = getRedis();
    if (!redis || !redisReady()) return;
    const stream = redis.scanStream({ match: `${prefix}*`, count: 100 });
    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length) await redis.del(...keys).catch(() => undefined);
    }
  },

  async wrap<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
    const hit = await cache.get<T>(key);
    if (hit !== null) return hit;
    const value = await load();
    if (value !== null && value !== undefined) await cache.set(key, value, ttlSeconds);
    return value;
  },
};

export const cacheKeys = {
  post: (slug: string) => `post:${slug}`,
  profile: (username: string) => `profile:${username.toLowerCase()}`,
  feed: (kind: string, extra = "") => `feed:${kind}:${extra}`,
  trendingTags: () => "tags:trending",
};
