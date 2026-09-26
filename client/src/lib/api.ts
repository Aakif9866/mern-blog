/**
 * Fetch wrapper for the Klyro API. Auth lives in httpOnly cookies, so nothing
 * token-related is ever read or stored in JavaScript. On a 401 the client
 * silently rotates the refresh token once and retries.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "ERROR",
    public details?: unknown
  ) {
    super(message);
  }
}

type Json = Record<string, unknown> | unknown[];
interface Options {
  method?: string;
  body?: Json | FormData;
  signal?: AbortSignal;
  /** Don't try a token refresh on 401 (used by auth endpoints themselves). */
  noRefresh?: boolean;
}

let refreshing: Promise<boolean> | null = null;
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(fn: () => void) {
  onSessionExpired = fn;
}

function refreshSession(): Promise<boolean> {
  refreshing ??= fetch("/api/auth/refresh", { method: "POST", credentials: "include", headers: { "X-Requested-With": "klyro" } })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      setTimeout(() => (refreshing = null), 0);
    });
  return refreshing;
}

async function request<T>(path: string, opts: Options = {}, retried = false): Promise<T> {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(`/api${path}`, {
    method: opts.method ?? "GET",
    credentials: "include",
    signal: opts.signal,
    headers: {
      "X-Requested-With": "klyro",
      Accept: "application/json",
      ...(opts.body && !isForm ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body ? (isForm ? (opts.body as FormData) : JSON.stringify(opts.body)) : undefined,
  });

  if (res.status === 401 && !opts.noRefresh && !retried) {
    if (await refreshSession()) return request<T>(path, opts, true);
    onSessionExpired?.();
  }

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const err = (data ?? {}) as { message?: string; code?: string; details?: unknown };
    throw new ApiError(res.status, err.message ?? res.statusText ?? "Request failed", err.code, err.details);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: Json | FormData, opts: Omit<Options, "body" | "method"> = {}) => request<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: Json) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: Json) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string, body?: Json) => request<T>(path, { method: "DELETE", body }),
};

export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}
