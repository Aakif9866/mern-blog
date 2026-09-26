import { readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import mongoose, { type ConnectOptions } from "mongoose";

process.env.NODE_ENV = "test";
const uri = readFileSync(path.join(os.tmpdir(), "klyro-test-mongo-uri"), "utf8");
// Each test file gets its own database so files can't see each other's data.
const dbName = `klyro_${path.basename(expect.getState().testPath ?? "x").replace(/\W/g, "_")}`;

beforeAll(async () => {
  // The driver loads its `os` adapter with a dynamic import(), which Jest's sandbox
  // doesn't support; without it the handshake metadata is empty and MongoDB rejects it.
  await mongoose.connect(uri, { dbName, runtimeAdapters: { os } } as ConnectOptions);
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
