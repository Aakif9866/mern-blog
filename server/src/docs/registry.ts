import { Router, type RequestHandler } from "express";
import type { z } from "zod";
import { validate } from "../middleware/validate";
import { requireActiveUser, requireAuth, requireRole } from "../middleware/auth";
import { writeLimiter } from "../middleware/security";

export type Access = "public" | "user" | "writer" | "moderator" | "admin";
type Method = "get" | "post" | "put" | "patch" | "delete";

export interface RouteDoc {
  method: Method;
  path: string;
  tag: string;
  summary: string;
  access: Access;
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
  upload?: boolean;
}

/** Every API route, recorded as it is defined, so the OpenAPI spec never drifts from the code. */
export const routeDocs: RouteDoc[] = [];

const ACCESS: Record<Access, RequestHandler[]> = {
  public: [],
  user: [requireAuth],
  writer: [requireAuth, requireActiveUser, writeLimiter],
  moderator: [requireAuth, requireRole("moderator")],
  admin: [requireAuth, requireRole("admin")],
};

interface Meta {
  summary: string;
  access?: Access;
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
  upload?: boolean;
  /** Extra middleware that runs before validation (rate limiters, uploads). */
  before?: RequestHandler[];
}

export function documentedRouter(base: string, tag: string) {
  const router = Router();
  const add = (method: Method) => (path: string, meta: Meta, handler: RequestHandler) => {
    const access = meta.access ?? "public";
    routeDocs.push({ method, path: `${base}${path}`, tag, access, summary: meta.summary, body: meta.body, query: meta.query, params: meta.params, upload: meta.upload });
    const schemas = { body: meta.body, query: meta.query, params: meta.params };
    const needsValidation = Boolean(meta.body || meta.query || meta.params);
    router[method](path, ...ACCESS[access], ...(meta.before ?? []), ...(needsValidation ? [validate(schemas)] : []), handler);
  };
  return { router, get: add("get"), post: add("post"), put: add("put"), patch: add("patch"), delete: add("delete") };
}
