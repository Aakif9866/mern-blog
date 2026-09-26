import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../lib/logger";

mongoose.set("strictQuery", true);

export async function connectDb(uri = env.mongoUri): Promise<void> {
  if (!uri) throw new Error("MONGO_URI is not configured");
  await mongoose.connect(uri);
  logger.info({ db: mongoose.connection.name }, "MongoDB connected");
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
