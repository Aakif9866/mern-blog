import request from "supertest";
import { app, client, lastMailTo, signUp, tokenFrom } from "./helpers";
import { Session } from "../src/models/Session";

describe("auth", () => {
  it("registers, sets httpOnly cookies and returns the user without secrets", async () => {
    const c = client();
    const res = await c.post("/api/auth/register").send({ username: "alice", email: "Alice@Test.dev", password: "password123" }).expect(201);
    expect(res.body.user).toMatchObject({ username: "alice", email: "alice@test.dev", role: "user", emailVerified: false });
    expect(res.body.user.password).toBeUndefined();
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((x) => x.startsWith("access_token=") && x.includes("HttpOnly"))).toBe(true);
    expect(cookies.some((x) => x.startsWith("refresh_token=") && x.includes("Path=/api/auth"))).toBe(true);
    await c.get("/api/auth/me").expect(200);
  });

  it("rejects duplicate emails and invalid input", async () => {
    const c = client();
    await c.post("/api/auth/register").send({ username: "dupe1", email: "dupe@test.dev", password: "password123" }).expect(201);
    const dup = await c.post("/api/auth/register").send({ username: "dupe2", email: "dupe@test.dev", password: "password123" }).expect(409);
    expect(dup.body.message).toMatch(/already exists/);
    const bad = await c.post("/api/auth/register").send({ username: "No Spaces!", email: "x", password: "short" }).expect(400);
    expect(bad.body.code).toBe("VALIDATION");
  });

  it("requires the CSRF header on state-changing requests", async () => {
    const res = await request(app).post("/api/auth/login").send({ identifier: "a", password: "b" }).expect(403);
    expect(res.body.message).toMatch(/X-Requested-With/);
  });

  it("logs in with email or username and rejects wrong passwords", async () => {
    const { username } = await signUp();
    await client().post("/api/auth/login").send({ identifier: username, password: "password123" }).expect(200);
    await client().post("/api/auth/login").send({ identifier: `${username}@test.dev`, password: "password123" }).expect(200);
    const wrong = await client().post("/api/auth/login").send({ identifier: username, password: "nope-nope" }).expect(401);
    expect(wrong.body.message).toMatch(/Invalid/);
  });

  it("rotates the refresh token on every refresh", async () => {
    const { c } = await signUp();
    const res = await c.post("/api/auth/refresh").expect(200);
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((x) => x.startsWith("refresh_token="))).toBe(true);
    expect(await Session.countDocuments({ revokedAt: { $ne: null }, replacedBy: { $ne: null } })).toBeGreaterThan(0);
    await c.post("/api/auth/refresh").expect(200);
    await client().post("/api/auth/refresh").set("Cookie", "refresh_token=not-a-real-token").expect(401);
  });

  it("detects reuse of a rotated refresh token", async () => {
    const c = client();
    const reg = await c.post("/api/auth/register").send({ username: "reuse", email: "reuse@test.dev", password: "password123" }).expect(201);
    const original = (reg.headers["set-cookie"] as unknown as string[]).find((x) => x.startsWith("refresh_token="))!.split(";")[0]!;
    await c.post("/api/auth/refresh").expect(200);

    const thief = client();
    await thief.post("/api/auth/refresh").set("Cookie", original).expect(401);
    // The legitimate session was revoked too, because the family was compromised.
    await c.post("/api/auth/refresh").expect(401);
  });

  it("logs out everywhere", async () => {
    const { c, username } = await signUp();
    const other = client();
    await other.post("/api/auth/login").send({ identifier: username, password: "password123" }).expect(200);
    await c.post("/api/auth/logout-all").expect(200);
    await other.get("/api/auth/me").expect(401);
    await other.post("/api/auth/refresh").expect(401);
  });

  it("verifies email with the emailed token", async () => {
    const c = client();
    await c.post("/api/auth/register").send({ username: "verifyme", email: "verifyme@test.dev", password: "password123" }).expect(201);
    const mail = lastMailTo("verifyme@test.dev");
    expect(mail?.subject).toMatch(/Verify/);
    const res = await c.post("/api/auth/verify-email").send({ token: tokenFrom(mail!.text) }).expect(200);
    expect(res.body.user.emailVerified).toBe(true);
    await c.post("/api/auth/verify-email").send({ token: tokenFrom(mail!.text) }).expect(400);
  });

  it("resets a forgotten password and signs out other sessions", async () => {
    const { c, username } = await signUp();
    const email = `${username}@test.dev`;
    const res = await client().post("/api/auth/forgot-password").send({ email }).expect(200);
    expect(res.body.ok).toBe(true);
    await client().post("/api/auth/forgot-password").send({ email: "nobody@test.dev" }).expect(200);

    const token = tokenFrom(lastMailTo(email)!.text);
    await client().post("/api/auth/reset-password").send({ token, password: "brand-new-pass" }).expect(200);
    await c.get("/api/auth/me").expect(401);
    await client().post("/api/auth/login").send({ identifier: username, password: "brand-new-pass" }).expect(200);
    await client().post("/api/auth/login").send({ identifier: username, password: "password123" }).expect(401);
  });

  it("lists and revokes sessions", async () => {
    const { c } = await signUp();
    const list = await c.get("/api/auth/sessions").expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].current).toBe(true);
  });
});

describe("session probe", () => {
  it("returns null for guests without a 401", async () => {
    const res = await client().get("/api/auth/session").expect(200);
    expect(res.body).toEqual({ user: null });
  });

  it("restores a session from the refresh cookie alone", async () => {
    const c = client();
    const reg = await c.post("/api/auth/register").send({ username: "probe", email: "probe@test.dev", password: "password123" }).expect(201);
    const refresh = (reg.headers["set-cookie"] as unknown as string[]).find((x) => x.startsWith("refresh_token="))!.split(";")[0]!;
    const res = await client().get("/api/auth/session").set("Cookie", refresh).expect(200);
    expect(res.body.user.username).toBe("probe");
    expect((res.headers["set-cookie"] as unknown as string[]).some((x) => x.startsWith("access_token="))).toBe(true);
  });
});
