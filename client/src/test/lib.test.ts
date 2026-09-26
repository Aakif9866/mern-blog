import { describe, expect, it, vi } from "vitest";
import { api, ApiError, qs } from "@/lib/api";
import { compact, displayName, plural, timeAgo } from "@/lib/format";
import { jsonResponse } from "./utils";

describe("format helpers", () => {
  it("formats relative times and counts", () => {
    expect(timeAgo(new Date(Date.now() - 3 * 3600_000))).toBe("3 hours ago");
    expect(timeAgo(new Date())).toBe("just now");
    expect(compact(1530)).toBe("1.5K");
    expect(plural(1, "post")).toBe("1 post");
    expect(plural(2, "post")).toBe("2 posts");
    expect(displayName({ username: "sam", name: "" })).toBe("sam");
    expect(displayName(null)).toBe("Deleted user");
  });

  it("builds query strings without empty values", () => {
    expect(qs({ a: 1, b: "", c: undefined, d: "x y" })).toBe("?a=1&d=x+y");
    expect(qs({})).toBe("");
  });
});

describe("api client", () => {
  it("sends the CSRF header and cookies", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ ok: true }));
    await api.post("/x", { a: 1 });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("/api/x");
    expect(init?.credentials).toBe("include");
    expect((init?.headers as Record<string, string>)["X-Requested-With"]).toBe("klyro");
  });

  it("refreshes the session once on 401 and retries", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ message: "expired" }, 401))
      .mockResolvedValueOnce(jsonResponse({ user: {} }))
      .mockResolvedValueOnce(jsonResponse({ value: 42 }));
    await expect(api.get<{ value: number }>("/thing")).resolves.toEqual({ value: 42 });
    expect(fetch.mock.calls.map((c) => c[0])).toEqual(["/api/thing", "/api/auth/refresh", "/api/thing"]);
  });

  it("throws ApiError with the server message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ message: "Nope", code: "FORBIDDEN" }, 403));
    const err = await api.get("/secret").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 403, message: "Nope", code: "FORBIDDEN" });
  });
});
