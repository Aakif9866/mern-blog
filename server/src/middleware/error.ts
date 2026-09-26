import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { MulterError } from "multer";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, statusCode: 404, code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` });
}

// Express recognises error handlers by their four arguments.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let status = 500;
  let code = "INTERNAL";
  let message = "Something went wrong";
  let details: unknown;

  if (err instanceof AppError) {
    ({ statusCode: status, code, message, details } = err);
  } else if (err instanceof ZodError) {
    status = 400;
    code = "VALIDATION";
    message = err.issues[0] ? `${err.issues[0].path.join(".") || "input"}: ${err.issues[0].message}` : "Invalid input";
    details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    code = "BAD_ID";
    message = `Invalid ${err.path}`;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    code = "VALIDATION";
    message = Object.values(err.errors)[0]?.message ?? "Invalid input";
  } else if (typeof err === "object" && err && "code" in err && (err as { code: unknown }).code === 11000) {
    status = 409;
    code = "DUPLICATE";
    const field = Object.keys((err as { keyValue?: object }).keyValue ?? {})[0];
    message = field ? `That ${field} is already taken` : "Duplicate value";
  } else if (err instanceof MulterError) {
    status = 400;
    code = "UPLOAD";
    message = err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message;
  } else if (typeof err === "object" && err && "type" in err && (err as { type: unknown }).type === "entity.too.large") {
    status = 413;
    code = "TOO_LARGE";
    message = "Request body is too large";
  } else if (err instanceof SyntaxError && "body" in err) {
    status = 400;
    code = "BAD_JSON";
    message = "Malformed JSON body";
  }

  if (status >= 500) logger.error({ err, path: req.path }, "Unhandled error");

  res.status(status).json({ success: false, statusCode: status, code, message, ...(details ? { details } : {}) });
}
