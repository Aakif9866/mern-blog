import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

interface Schemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

/** Validates request parts with Zod. Parsed values are available through req.valid. */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.valid = {
      body: schemas.body ? schemas.body.parse(req.body ?? {}) : undefined,
      query: schemas.query ? schemas.query.parse(req.query) : undefined,
      params: schemas.params ? schemas.params.parse(req.params) : undefined,
    };
    next();
  };
}

export function body<T>(req: Request): T {
  return req.valid?.body as T;
}
export function query<T>(req: Request): T {
  return req.valid?.query as T;
}
export function params<T>(req: Request): T {
  return req.valid?.params as T;
}
