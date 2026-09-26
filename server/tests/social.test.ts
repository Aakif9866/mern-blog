import { client, publishedPost, signUp } from "./helpers";
import { Notification } from "../src/models/Notification";
import { User } from "../src/models/User";
import { Post } from "../src/models/Post";

describe("social", () => {
  it("follows and unfollows users, keeping counts and notifying", async () => {
    const a = await signUp();
    const b = await signUp();
    await a.c.post(`/api/users/${b.username}/follow`).expect(200);
    await a.c.post(`/api/users/${b.username}/follow`).expect(200); // idempotent
    expect((await User.findById(b.id))?.followersCount).toBe(1);
    expect(await Notification.countDocuments({ recipient: b.id, type: "follow" })).toBe(1);

    const profile = await a.c.get(`/api/users/${b.username}`).expect(200);
    expect(profile.body.isFollowing).toBe(true);
    const followers = await client().get(`/api/users/${b.username}/followers`).expect(200);
    expect(followers.body.items[0].username).toBe(a.username);

    await a.c.delete(`/api/users/${b.username}/follow`).expect(200);
    expect((await User.findById(b.id))?.followersCount).toBe(0);
    await a.c.post(`/api/users/${a.username}/follow`).expect(400);
  });

  it("builds the following feed from followed people and tags", async () => {
    const writer = await signUp();
    const reader = await signUp();
    const other = await signUp();
    await publishedPost(writer.c, "From someone I follow");
    await publishedPost(other.c, "Tagged post", { tags: ["golang"] });
    await publishedPost(other.c, "Unrelated post");

    const empty = await reader.c.get("/api/posts?type=following").expect(200);
    expect(empty.body.items).toHaveLength(0);
    await reader.c.post(`/api/users/${writer.username}/follow`).expect(200);
    await reader.c.post("/api/tags/golang/follow").expect(200);
    const feed = await reader.c.get("/api/posts?type=following").expect(200);
    expect(feed.body.items.map((p: { title: string }) => p.title).sort()).toEqual(["From someone I follow", "Tagged post"]);
    await client().get("/api/posts?type=following").expect(401);
  });

  it("toggles Like and Helpful reactions", async () => {
    const author = await signUp();
    const fan = await signUp();
    const post = await publishedPost(author.c);
    const like = await fan.c.post(`/api/posts/${post._id}/reactions`).send({ type: "like" }).expect(200);
    expect(like.body).toMatchObject({ active: true, likesCount: 1 });
    const helpful = await fan.c.post(`/api/posts/${post._id}/reactions`).send({ type: "helpful" }).expect(200);
    expect(helpful.body).toMatchObject({ active: true, helpfulCount: 1 });
    const unlike = await fan.c.post(`/api/posts/${post._id}/reactions`).send({ type: "like" }).expect(200);
    expect(unlike.body).toMatchObject({ active: false, likesCount: 0 });

    const state = await fan.c.get(`/api/posts/slug/${post.slug}`).expect(200);
    expect(state.body.viewer).toMatchObject({ liked: false, helpful: true });
    expect(await Notification.countDocuments({ recipient: author.id, type: "reaction" })).toBe(2);
  });

  it("bookmarks posts into collections", async () => {
    const author = await signUp();
    const reader = await signUp();
    const post = await publishedPost(author.c);
    const list = await reader.c.post("/api/bookmarks/collections").send({ name: "Read later" }).expect(201);
    await reader.c.put(`/api/posts/${post._id}/bookmark`).send({ list: list.body._id }).expect(200);
    expect((await Post.findById(post._id))?.bookmarksCount).toBe(1);

    const inList = await reader.c.get(`/api/bookmarks?list=${list.body._id}`).expect(200);
    expect(inList.body.items).toHaveLength(1);
    const lists = await reader.c.get("/api/bookmarks/collections").expect(200);
    expect(lists.body).toMatchObject({ total: 1, collections: [{ name: "Read later", count: 1 }] });

    await reader.c.delete(`/api/bookmarks/collections/${list.body._id}`).expect(200);
    const unsorted = await reader.c.get("/api/bookmarks?list=none").expect(200);
    expect(unsorted.body.items).toHaveLength(1);
    await reader.c.delete(`/api/posts/${post._id}/bookmark`).expect(200);
    expect((await Post.findById(post._id))?.bookmarksCount).toBe(0);
  });

  it("supports nested replies, mentions and notifications", async () => {
    const author = await signUp();
    const alice = await signUp();
    const bob = await signUp();
    const post = await publishedPost(author.c);

    const top = await alice.c.post("/api/comments").send({ postId: post._id, content: "Great post!" }).expect(201);
    const reply = await bob.c.post("/api/comments").send({ postId: post._id, parentId: top.body._id, content: `Agreed @${alice.username}` }).expect(201);
    expect(reply.body.depth).toBe(1);
    expect(reply.body.root).toBe(top.body._id);

    const types = async (id: string) => (await Notification.find({ recipient: id }).lean()).map((n) => n.type).sort();
    expect(await types(author.id)).toEqual(["comment", "comment"]);
    expect(await types(alice.id)).toEqual(["reply"]); // mention is folded into the reply

    const list = await client().get(`/api/comments/post/${post._id}`).expect(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.replies).toHaveLength(1);

    const liked = await author.c.post(`/api/comments/${top.body._id}/like`).expect(200);
    expect(liked.body).toEqual({ liked: true, likesCount: 1 });

    await bob.c.patch(`/api/comments/${top.body._id}`).send({ content: "hijack" }).expect(403);
    await alice.c.delete(`/api/comments/${top.body._id}`).expect(200);
    const after = await client().get(`/api/comments/post/${post._id}`).expect(200);
    expect(after.body.items[0]).toMatchObject({ deleted: true, content: "" });
    expect((await Post.findById(post._id))?.commentsCount).toBe(1);
  });

  it("lists and marks notifications as read", async () => {
    const a = await signUp();
    const b = await signUp();
    await a.c.post(`/api/users/${b.username}/follow`).expect(200);
    const count = await b.c.get("/api/notifications/unread-count").expect(200);
    expect(count.body.count).toBe(1);
    const list = await b.c.get("/api/notifications").expect(200);
    expect(list.body.items[0]).toMatchObject({ type: "follow", read: false, actor: { username: a.username } });
    await b.c.post("/api/notifications/read").send({}).expect(200);
    expect((await b.c.get("/api/notifications/unread-count")).body.count).toBe(0);
  });

  it("updates the profile and completes onboarding", async () => {
    const { c } = await signUp();
    const res = await c.patch("/api/users/me").send({ bio: "Hello", website: "https://me.dev", emailPrefs: { digest: false } }).expect(200);
    expect(res.body.user).toMatchObject({ bio: "Hello", emailPrefs: { digest: false, comments: true } });
    await c.patch("/api/users/me").send({ website: "javascript:alert(1)" }).expect(400);
    await c.patch("/api/users/me").send({ role: "admin" }).expect(400);
    const done = await c.post("/api/users/me/onboarding").send({ tags: ["react", "css"], follows: [] }).expect(200);
    expect(done.body.user).toMatchObject({ onboarded: true, followedTags: ["react", "css"] });
  });

  it("deletes an account and cleans up", async () => {
    const author = await signUp();
    const fan = await signUp();
    const post = await publishedPost(author.c);
    await fan.c.post(`/api/users/${author.username}/follow`).expect(200);
    await author.c.delete("/api/users/me").send({ password: "wrong" }).expect(400);
    await author.c.delete("/api/users/me").send({ password: "password123" }).expect(200);
    expect(await User.findById(author.id)).toBeNull();
    expect((await User.findById(fan.id))?.followingCount).toBe(0);
    await client().get(`/api/posts/slug/${post.slug}`).expect(404);
  });
});
