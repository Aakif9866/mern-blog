import { client, publishedPost, signUp } from "./helpers";
import { Post } from "../src/models/Post";
import { User } from "../src/models/User";

describe("moderation", () => {
  it("routes reports through the moderation queue", async () => {
    const author = await signUp();
    const reporter = await signUp();
    const mod = await signUp({ role: "moderator" });
    const post = await publishedPost(author.c, "Spammy post");

    await author.c.post("/api/reports").send({ targetType: "post", targetId: post._id, reason: "spam" }).expect(400);
    const report = await reporter.c.post("/api/reports").send({ targetType: "post", targetId: post._id, reason: "spam", details: "ads" }).expect(201);
    await reporter.c.post("/api/reports").send({ targetType: "post", targetId: post._id, reason: "spam" }).expect(409);

    await reporter.c.get("/api/mod/reports").expect(403);
    const queue = await mod.c.get("/api/mod/reports").expect(200);
    expect(queue.body.items[0]).toMatchObject({ reason: "spam", content: { title: "Spammy post" } });

    await mod.c.post(`/api/mod/reports/${report.body._id}/resolve`).send({ action: "remove_and_suspend", suspendDays: 3 }).expect(200);
    expect((await Post.findById(post._id))?.deletedAt).toBeTruthy();
    expect((await User.findById(author.id))?.status).toBe("suspended");
    const blocked = await author.c.post("/api/posts").send({ title: "Back again" }).expect(403);
    expect(blocked.body.message).toMatch(/suspended/);
    await mod.c.post(`/api/mod/reports/${report.body._id}/resolve`).send({ action: "dismiss" }).expect(409);
  });

  it("enforces the role hierarchy", async () => {
    const user = await signUp();
    const mod = await signUp({ role: "moderator" });
    const otherMod = await signUp({ role: "moderator" });
    const admin = await signUp({ role: "admin" });

    await mod.c.patch(`/api/mod/users/${user.id}/status`).send({ status: "banned" }).expect(403);
    await mod.c.patch(`/api/mod/users/${otherMod.id}/status`).send({ status: "suspended" }).expect(403);
    await mod.c.patch(`/api/mod/users/${user.id}/role`).send({ role: "admin" }).expect(403);

    await admin.c.patch(`/api/mod/users/${user.id}/status`).send({ status: "banned" }).expect(200);
    await user.c.get("/api/auth/me").expect(401);
    await client().get(`/api/users/${user.username}`).expect(404);

    await admin.c.patch(`/api/mod/users/${otherMod.id}/role`).send({ role: "user" }).expect(200);
    await otherMod.c.get("/api/mod/reports").expect(401);
  });

  it("reports analytics to moderators", async () => {
    const author = await signUp();
    const mod = await signUp({ role: "moderator" });
    await publishedPost(author.c, "Counted post");
    const res = await mod.c.get("/api/mod/analytics").expect(200);
    expect(res.body.totals.posts).toBeGreaterThanOrEqual(1);
    expect(res.body.series).toHaveLength(30);
    const users = await mod.c.get(`/api/mod/users?q=${author.username}`).expect(200);
    expect(users.body.items).toHaveLength(1);
  });
});
