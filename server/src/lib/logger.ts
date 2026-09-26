import pino from "pino";
import { env } from "../config/env";

export const logger = pino({
  level: env.logLevel,
  redact: {
    paths: ["req.headers.cookie", "req.headers.authorization", "res.headers['set-cookie']", "*.password", "*.token"],
    censor: "[redacted]",
  },
  ...(env.isDev ? { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } } } : {}),
});
