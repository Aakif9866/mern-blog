import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../lib/logger";

mongoose.set("strictQuery", true);

export async function connectDb(uri = env.mongoUri): Promise<void> {
  if (!uri) throw new Error("MONGO_URI is not configured");
  await mongoose.connect(uri);
  logger.info({ db: mongoose.connection.name }, "MongoDB connected");
}

/** Builds any missing indexes (text search, uniques, TTLs). Existing ones are left alone. */
export async function ensureIndexes(): Promise<void> {
  const results = await Promise.allSettled(Object.values(mongoose.models).map((m) => m.createIndexes()));
  for (const r of results) if (r.status === "rejected") logger.error({ err: r.reason }, "Index build failed");
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
