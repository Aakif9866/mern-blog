import type { UserDoc } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      /** Set by optionalAuth / requireAuth when a valid access token is present. */
      user?: UserDoc;
      /** Parsed and validated request data, set by validate(). */
      valid?: { body?: unknown; query?: unknown; params?: unknown };
    }
  }
}

export {};
