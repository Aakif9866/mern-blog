import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_URL: z.string().url().default("http://localhost:5173"),
  CORS_ORIGINS: optionalString,
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),

  MONGO_URI: optionalString,
  /** v1 name for the connection string, still accepted. */
  MONGO: optionalString,
  REDIS_URL: optionalString,

  JWT_ACCESS_SECRET: optionalString,
  /** v1 name for the JWT secret, used as a fallback for the access secret. */
  JWT_SECRET: optionalString,
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_DOMAIN: optionalString,
  /** Allow auth cookies over plain HTTP in production mode (local Docker only). */
  COOKIE_INSECURE: bool,

  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  SMTP_SECURE: bool,
  MAIL_FROM: z.string().default("Klyro <no-reply@klyro.dev>"),

  GOOGLE_CLIENT_ID: optionalString,

  ANTHROPIC_API_KEY: optionalString,
  AI_MODEL: z.string().default("claude-opus-5"),
  VOYAGE_API_KEY: optionalString,
  VOYAGE_MODEL: z.string().default("voyage-3.5-lite"),

  ATLAS_SEARCH: bool,
  UPLOAD_DIR: z.string().default("uploads"),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(5),
  DISABLE_JOBS: bool,
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Logger depends on env, so this one message goes straight to stderr.
  process.stderr.write(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}\n`);
  process.exit(1);
}

const raw = parsed.data;
const isProd = raw.NODE_ENV === "production";
const isTest = raw.NODE_ENV === "test";

const mongoUri = raw.MONGO_URI ?? raw.MONGO ?? (isTest ? undefined : "mongodb://127.0.0.1:27017/klyro");
const accessSecret = raw.JWT_ACCESS_SECRET ?? raw.JWT_SECRET ?? (isProd ? undefined : "dev-only-insecure-secret-change-me");

if (isProd && !accessSecret) {
  process.stderr.write("JWT_ACCESS_SECRET must be set in production\n");
  process.exit(1);
}

export const env = {
  ...raw,
  isProd,
  isTest,
  isDev: raw.NODE_ENV === "development",
  mongoUri,
  accessSecret: accessSecret as string,
  corsOrigins: (raw.CORS_ORIGINS ?? raw.APP_URL).split(",").map((s) => s.trim()).filter(Boolean),
  logLevel: raw.LOG_LEVEL ?? (isTest ? "silent" : isProd ? "info" : "debug"),
  aiEnabled: Boolean(raw.ANTHROPIC_API_KEY),
  mailEnabled: Boolean(raw.SMTP_HOST),
};

export type Env = typeof env;
