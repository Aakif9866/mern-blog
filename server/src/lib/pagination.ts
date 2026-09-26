import { Types } from "mongoose";
import { badRequest } from "./errors";

/**
 * Cursor pagination over a descending sort on one field plus _id as a tiebreaker.
 * The cursor is opaque to clients: base64url of { v: lastValue, id: lastId }.
 */
type CursorValue = string | number | null;
interface CursorPayload {
  v: CursorValue;
  d?: 1; // value is a date
  id: string;
}

export function encodeCursor(value: unknown, id: Types.ObjectId | string): string {
  const payload: CursorPayload =
    value instanceof Date ? { v: value.toISOString(), d: 1, id: String(id) } : { v: (value ?? null) as CursorValue, id: String(id) };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeCursor(cursor: string): { value: Date | CursorValue; id: Types.ObjectId } {
  try {
    const p = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as CursorPayload;
    if (!Types.ObjectId.isValid(p.id)) throw new Error("bad id");
    return { value: p.d && typeof p.v === "string" ? new Date(p.v) : p.v, id: new Types.ObjectId(p.id) };
  } catch {
    throw badRequest("Invalid cursor");
  }
}

/** Mongo filter for "rows after the cursor" when sorting { field: -1, _id: -1 }. */
export function afterCursor(field: string, cursor?: string): Record<string, unknown> {
  if (!cursor) return {};
  const { value, id } = decodeCursor(cursor);
  return { $or: [{ [field]: { $lt: value } }, { [field]: value, _id: { $lt: id } }] };
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Call with limit + 1 rows fetched; trims the extra row and builds the next cursor. */
export function toPage<T extends { _id: Types.ObjectId }>(rows: T[], limit: number, field: keyof T | "_id"): Page<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  return { items, nextCursor: hasMore && last ? encodeCursor(last[field as keyof T], last._id) : null };
}
