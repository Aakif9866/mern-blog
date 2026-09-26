const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "";
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function formatDate(date: string | Date | null | undefined, withYear = true): string {
  if (!date) return "";
  const d = new Date(date);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en", { month: "short", day: "numeric", ...(withYear && !sameYear ? { year: "numeric" } : {}) });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleString("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const compactFmt = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
export const compact = (n: number) => compactFmt.format(n);

export function plural(n: number, word: string, pluralWord = `${word}s`) {
  return `${compact(n)} ${n === 1 ? word : pluralWord}`;
}

export function displayName(u: { name?: string; username: string } | null | undefined): string {
  if (!u) return "Deleted user";
  return u.name?.trim() || u.username;
}
