import { MongoMemoryServer } from "mongodb-memory-server";
import { writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";

export const URI_FILE = path.join(os.tmpdir(), "klyro-test-mongo-uri");

export default async function globalSetup() {
  const mongo = await MongoMemoryServer.create();
  (globalThis as { __MONGO__?: MongoMemoryServer }).__MONGO__ = mongo;
  writeFileSync(URI_FILE, mongo.getUri());
}
