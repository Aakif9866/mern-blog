import type { MongoMemoryServer } from "mongodb-memory-server";

export default async function globalTeardown() {
  await (globalThis as { __MONGO__?: MongoMemoryServer }).__MONGO__?.stop();
}
