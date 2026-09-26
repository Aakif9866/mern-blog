import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app";
import { registerJobs } from "../src/jobs";
import { User, type Role } from "../src/models/User";
import { sentMail } from "../src/lib/mailer";

registerJobs();
export const app: Express = createApp();

type Method = "get" | "post" | "put" | "patch" | "delete";

/** A cookie-keeping client that always sends the CSRF header. */
export function client() {
  const agent = request.agent(app);
  const call = (method: Method) => (url: string) => agent[method](url).set("X-Requested-With", "klyro");
  return { agent, get: call("get"), post: call("post"), put: call("put"), patch: call("patch"), delete: call("delete") };
}
export type Client = ReturnType<typeof client>;

let counter = 0;

/** Registers a user, verifies the email and optionally sets a role. */
export async function signUp(opts: { role?: Role; verified?: boolean; username?: string } = {}) {
  counter++;
  const username = opts.username ?? `user${counter}${Date.now().toString(36).slice(-4)}`;
  const c = client();
  const res = await c.post("/api/auth/register").send({ username, email: `${username}@test.dev`, password: "password123", name: `User ${counter}` });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  if (opts.verified !== false || opts.role) {
    await User.updateOne({ username }, { emailVerified: opts.verified !== false, ...(opts.role ? { role: opts.role } : {}) });
  }
  if (opts.role) {
    // Role is embedded in the access token, so sign in again to pick it up.
    await c.post("/api/auth/login").send({ identifier: username, password: "password123" }).expect(200);
  }
  return { c, username, id: String(res.body.user._id) };
}

export function lastMailTo(email: string) {
  return [...sentMail].reverse().find((m) => m.to === email);
}

export function tokenFrom(text: string): string {
  const m = text.match(/token=([^\s&"]+)/);
  if (!m?.[1]) throw new Error("no token in mail");
  return decodeURIComponent(m[1]);
}

export const LONG_BODY = `<p>${"Klyro posts need enough words to publish. ".repeat(10)}</p>`;

export async function publishedPost(c: Client, title = "A published post", extra: Record<string, unknown> = {}) {
  const draft = await c.post("/api/posts").send({ title, content: LONG_BODY, ...extra }).expect(201);
  const res = await c.post(`/api/posts/${draft.body._id}/publish`).send({}).expect(200);
  return res.body as { _id: string; slug: string; title: string };
}
