import { Queue, Worker, type JobsOptions } from "bullmq";
import { env } from "../config/env";
import { getRedis } from "./redis";
import { logger } from "./logger";

/**
 * Background jobs. With Redis they run through BullMQ (retries, schedules,
 * survives restarts). Without Redis they run in-process right away, which is
 * fine for development and small deployments.
 */
type Handler = (data: never) => Promise<void>;
const handlers = new Map<string, Handler>();
const QUEUE_NAME = "klyro";
let queue: Queue | null = null;
let worker: Worker | null = null;
const timers: NodeJS.Timeout[] = [];

export function registerJob<T>(name: string, handler: (data: T) => Promise<void>): void {
  handlers.set(name, handler as Handler);
}

async function runInline(name: string, data: unknown): Promise<void> {
  const handler = handlers.get(name);
  if (!handler) return logger.warn({ name }, "No handler for job");
  try {
    await handler(data as never);
  } catch (err) {
    logger.error({ err, name }, "Job failed");
  }
}

export async function enqueue(name: string, data: unknown = {}, opts: JobsOptions = {}): Promise<void> {
  if (env.isTest) return runInline(name, data);
  const redis = getRedis();
  if (redis && queue) {
    await queue.add(name, data, { attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 500, removeOnFail: 1000, ...opts });
    return;
  }
  setImmediate(() => void runInline(name, data));
}

interface Schedule {
  name: string;
  everyMs?: number;
  cron?: string;
}

export async function startJobs(schedules: Schedule[]): Promise<void> {
  if (env.isTest || env.DISABLE_JOBS) return;
  const redis = getRedis();
  if (redis) {
    queue = new Queue(QUEUE_NAME, { connection: redis });
    worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        const handler = handlers.get(job.name);
        if (!handler) throw new Error(`No handler for job ${job.name}`);
        await handler(job.data as never);
      },
      { connection: redis.duplicate(), concurrency: 5 }
    );
    worker.on("failed", (job, err) => logger.error({ err, job: job?.name }, "Job failed"));
    for (const s of schedules) {
      await queue.upsertJobScheduler(s.name, s.cron ? { pattern: s.cron } : { every: s.everyMs }, { name: s.name });
    }
    logger.info("BullMQ workers started");
    return;
  }
  for (const s of schedules) {
    if (!s.everyMs) continue;
    timers.push(setInterval(() => void runInline(s.name, {}), s.everyMs).unref());
  }
  logger.info("Redis not configured: jobs run in-process");
}

export async function stopJobs(): Promise<void> {
  timers.forEach(clearInterval);
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
