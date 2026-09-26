import { randomBytes } from "node:crypto";
import { htmlToText } from "./sanitize";

export function slugify(input: string, maxLength = 80): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .slice(0, maxLength)
    .replace(/^-+|-+$/g, "");
}

/** Slug plus a short random suffix, so titles never have to be unique. */
export function uniqueSlug(title: string): string {
  const base = slugify(title) || "untitled";
  return `${base}-${randomBytes(3).toString("hex")}`;
}

export function normalizeTag(tag: string): string {
  return slugify(tag.replace(/^#/, ""), 30).replace(/-/g, "");
}

const WORDS_PER_MINUTE = 225;

export function readTimeMinutes(html: string): number {
  const words = htmlToText(html).split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function excerptFrom(html: string, length = 200): string {
  const text = htmlToText(html);
  if (text.length <= length) return text;
  return `${text.slice(0, length).replace(/\s+\S*$/, "")}…`;
}

/** Extracts unique lowercase @usernames. */
export function extractMentions(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/(?:^|[^\w@])@([a-z0-9_]{3,30})\b/gi)) {
    if (m[1]) found.add(m[1].toLowerCase());
  }
  return [...found];
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
