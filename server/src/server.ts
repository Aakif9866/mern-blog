import { createServer } from "node:http";
import { env } from "./config/env";
import { connectDb, disconnectDb } from "./config/db";
import { createApp } from "./app";
import { logger } from "./lib/logger";
import { getRedis, closeRedis } from "./lib/redis";
import { initSocket, closeSocket } from "./lib/socket";
import { registerJobs, startScheduledJobs } from "./jobs";
import { stopJobs } from "./lib/queue";

async function main() {
  await connectDb();
  getRedis();
  registerJobs();

  const app = createApp();
  const server = createServer(app);
  initSocket(server);
  await startScheduledJobs();

  server.listen(env.PORT, () => logger.info(`Klyro API listening on http://localhost:${env.PORT}`));

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down");
    server.close();
    await Promise.allSettled([closeSocket(), stopJobs()]);
    await Promise.allSettled([closeRedis(), disconnectDb()]);
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start");
  process.exit(1);
});
