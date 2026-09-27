import { client, lastMailTo, publishedPost, signUp } from "./helpers";
import { User } from "../src/models/User";
import { Post } from "../src/models/Post";
import { Follow } from "../src/models/Follow";
import { Notification } from "../src/models/Notification";
import { cleanupExpiredGuests } from "../src/services/user.service";

async function guest() {
  const c = client();
  const res = await c.post("/api/auth/guest").expect(201);
  return { c, user: res.body.user as { _id: string; username: string; isGuest: boolean; guestExpiresAt: string } };
}

describe("guest mode", () => {
  it("creates a temporary account that expires in about 24 hours", async () => {
    const { c, user } = await guest();
    expect(user.isGuest).toBe(true);
    expect(user.username).toMatch(/^guest_[a-z0-9]{8}$/);
    const hours = (new Date(user.guestExpiresAt).getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(23.9);
    expect(hours).toBeLessThanOrEqual(24);
    await c.get("/api/auth/session").expect(200);
  });

  it("lets guests follow, react, bookmark and draft, without notifying anyone", async () => {
    const author = await signUp();
    const post = await publishedPost(author.c);
    const { c } = await guest();

    await c.post(`/api/users/${author.username}/follow`).expect(200);
    await c.post(`/api/posts/${post._id}/reactions`).send({ type: "like" }).expect(200);
    await c.put(`/api/posts/${post._id}/bookmark`).send({}).expect(200);
    await c.post("/api/tags/react/follow").expect(200);
    const draft = await c.post("/api/posts").send({ title: "Guest draft" }).expect(201);
    await c.patch(`/api/posts/${draft.body._id}`).send({ content: "<p>trying the editor</p>" }).expect(200);

    expect((await Post.findById(post._id))?.likesCount).toBe(1);
    expect(await Notification.countDocuments({ recipient: author.id })).toBe(0);
  });

  it("blocks publishing, commenting, reporting, uploads, AI and password changes", async () => {
    const author = await signUp();
    const post = await publishedPost(author.c);
    const { c } = await guest();
    const draft = await c.post("/api/posts").send({ title: "Guest", content: "<p>long enough content for a post here</p>" }).expect(201);

    const blocked = [
      c.post(`/api/posts/${draft.body._id}/publish`).send({}),
      c.post("/api/comments").send({ postId: post._id, content: "hi" }),
      c.post("/api/reports").send({ targetType: "post", targetId: post._id, reason: "spam" }),
      c.post("/api/posts/images"),
      c.post("/api/posts/ai/suggest-tags").send({ title: "x", content: "y" }),
      c.post("/api/auth/change-password").send({ newPassword: "password123" }),
    ];
    for (const res of await Promise.all(blocked)) {
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("GUEST");
    }
  });

  it("stays out of search and writer suggestions", async () => {
    const { user } = await guest();
    const search = await client().get(`/api/search?q=${user.username}&type=users`).expect(200);
    expect(search.body.items).toHaveLength(0);
  });

  it("upgrades to a full account and keeps everything", async () => {
    const author = await signUp();
    const post = await publishedPost(author.c);
    const { c, user } = await guest();
    await c.post(`/api/users/${author.username}/follow`).expect(200);
    await c.put(`/api/posts/${post._id}/bookmark`).send({}).expect(200);

    const up = await c.post("/api/auth/guest/upgrade").send({ username: "keeper", email: "keeper@test.dev", password: "password123" }).expect(200);
    expect(up.body.user).toMatchObject({ _id: user._id, username: "keeper", isGuest: false, guestExpiresAt: null, emailVerified: false });
    expect(lastMailTo("keeper@test.dev")?.subject).toMatch(/Verify/);

    const bookmarks = await c.get("/api/bookmarks").expect(200);
    expect(bookmarks.body.items).toHaveLength(1);
    expect(await Follow.countDocuments({ follower: user._id })).toBe(1);
    await client().post("/api/auth/login").send({ identifier: "keeper", password: "password123" }).expect(200);
    await c.post("/api/auth/guest/upgrade").send({ username: "again", email: "again@test.dev", password: "password123" }).expect(400);
  });

  it("signs out and deletes expired guests, fixing counters", async () => {
    const author = await signUp();
    const post = await publishedPost(author.c);
    const { c, user } = await guest();
    await c.post(`/api/users/${author.username}/follow`).expect(200);
    await c.post(`/api/posts/${post._id}/reactions`).send({ type: "like" }).expect(200);

    await User.updateOne({ _id: user._id }, { guestExpiresAt: new Date(Date.now() - 1000) });
    await c.get("/api/auth/me").expect(401);
    const session = await c.get("/api/auth/session").expect(200);
    expect(session.body.user).toBeNull();

    expect(await cleanupExpiredGuests()).toBeGreaterThanOrEqual(1);
    expect(await User.findById(user._id)).toBeNull();
    expect((await User.findById(author.id))?.followersCount).toBe(0);
    expect((await Post.findById(post._id))?.likesCount).toBe(0);
  });
});
