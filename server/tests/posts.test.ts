import { client, LONG_BODY, publishedPost, signUp } from "./helpers";
import { Post } from "../src/models/Post";
import { publishDueScheduled } from "../src/services/post.service";

describe("posts", () => {
  it("blocks writing until the email is verified", async () => {
    const { c } = await signUp({ verified: false });
    const res = await c.post("/api/posts").send({ title: "Hi" }).expect(403);
    expect(res.body.message).toMatch(/verify/i);
  });

  it("creates a draft, autosaves it and keeps it private until published", async () => {
    const { c } = await signUp();
    const draft = await c.post("/api/posts").send({ title: "My first draft" }).expect(201);
    expect(draft.body.status).toBe("draft");

    await c.patch(`/api/posts/${draft.body._id}`).send({ content: LONG_BODY, tags: ["JavaScript", "#web-dev", "javascript"] }).expect(200);
    const saved = await Post.findById(draft.body._id).lean();
    expect(saved?.tags).toEqual(["javascript", "webdev"]);
    expect(saved?.readTime).toBeGreaterThanOrEqual(1);

    await client().get(`/api/posts/slug/${draft.body.slug}`).expect(404);
    await c.get(`/api/posts/slug/${draft.body.slug}`).expect(200);

    const published = await c.post(`/api/posts/${draft.body._id}/publish`).send({}).expect(200);
    expect(published.body.status).toBe("published");
    const read = await client().get(`/api/posts/slug/${published.body.slug}`).expect(200);
    expect(read.body.post.author.username).toBeDefined();
    expect(read.body.post.author.email).toBeUndefined();
    expect(read.body.viewer).toEqual({ liked: false, helpful: false, bookmarked: false, followingAuthor: false });
  });

  it("sanitizes post HTML on the server", async () => {
    const { c } = await signUp();
    const res = await c
      .post("/api/posts")
      .send({ title: "XSS", content: `<p onclick="x()">hi<script>alert(1)</script><img src="javascript:alert(1)"><a href="https://ok.dev">ok</a></p>` })
      .expect(201);
    expect(res.body.content).not.toMatch(/script|onclick|javascript:/);
    expect(res.body.content).toContain('rel="noopener noreferrer nofollow"');
  });

  it("refuses to publish empty posts and caps tags at five", async () => {
    const { c } = await signUp();
    const draft = await c.post("/api/posts").send({ title: "" }).expect(201);
    await c.post(`/api/posts/${draft.body._id}/publish`).send({}).expect(400);
    await c.post("/api/posts").send({ title: "Tags", tags: ["a", "b", "c", "d", "e", "f"] }).expect(400);
  });

  it("only lets the author edit", async () => {
    const { c } = await signUp();
    const post = await publishedPost(c);
    const { c: other } = await signUp();
    await other.patch(`/api/posts/${post._id}`).send({ title: "Hijacked" }).expect(403);
  });

  it("records edit history when a published post changes", async () => {
    const { c } = await signUp();
    const post = await publishedPost(c, "Original title");
    await c.patch(`/api/posts/${post._id}`).send({ title: "Better title" }).expect(200);
    const history = await c.get(`/api/posts/${post._id}/revisions`).expect(200);
    expect(history.body.items).toHaveLength(1);
    expect(history.body.items[0].title).toBe("Original title");
    const read = await client().get(`/api/posts/slug/${post.slug}`).expect(200);
    expect(read.body.post.editedAt).toBeTruthy();
  });

  it("schedules posts and publishes them when due", async () => {
    const { c } = await signUp();
    const draft = await c.post("/api/posts").send({ title: "Later", content: LONG_BODY }).expect(201);
    const when = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const res = await c.post(`/api/posts/${draft.body._id}/publish`).send({ scheduledFor: when }).expect(200);
    expect(res.body.status).toBe("scheduled");

    await Post.updateOne({ _id: draft.body._id }, { scheduledFor: new Date(Date.now() - 1000) });
    expect(await publishDueScheduled()).toBe(1);
    expect((await Post.findById(draft.body._id))?.status).toBe("published");
  });

  it("soft-deletes posts", async () => {
    const { c } = await signUp();
    const post = await publishedPost(c);
    await c.delete(`/api/posts/${post._id}`).expect(200);
    await client().get(`/api/posts/slug/${post.slug}`).expect(404);
    expect(await Post.findById(post._id).lean()).toMatchObject({ deletedAt: expect.any(Date) });
  });

  it("paginates the latest feed with cursors", async () => {
    const { c } = await signUp();
    for (let i = 0; i < 5; i++) await publishedPost(c, `Feed post ${i}`);
    const first = await client().get("/api/posts?type=latest&limit=2").expect(200);
    expect(first.body.items).toHaveLength(2);
    expect(first.body.nextCursor).toBeTruthy();
    const second = await client().get(`/api/posts?type=latest&limit=2&cursor=${first.body.nextCursor}`).expect(200);
    expect(second.body.items).toHaveLength(2);
    const ids = new Set([...first.body.items, ...second.body.items].map((p: { _id: string }) => p._id));
    expect(ids.size).toBe(4);
    await client().get("/api/posts?cursor=garbage").expect(400);
  });

  it("counts a view once per viewer", async () => {
    const { c } = await signUp();
    const post = await publishedPost(c);
    const viewer = client();
    expect((await viewer.post(`/api/posts/${post._id}/view`).expect(200)).body.counted).toBe(true);
    expect((await viewer.post(`/api/posts/${post._id}/view`).expect(200)).body.counted).toBe(false);
    expect((await Post.findById(post._id))?.views).toBe(1);
  });

  it("finds posts through search and tag pages", async () => {
    const { c } = await signUp();
    await publishedPost(c, "Understanding quantum widgets", { tags: ["physics"] });
    const search = await client().get("/api/search?q=quantum&type=posts").expect(200);
    expect(search.body.items[0].title).toBe("Understanding quantum widgets");
    const prefix = await client().get("/api/search?q=quan%20widg").expect(200);
    expect(prefix.body.posts.map((p: { title: string }) => p.title)).toContain("Understanding quantum widgets");
    const tag = await client().get("/api/tags/physics/posts").expect(200);
    expect(tag.body.items).toHaveLength(1);
    const tagInfo = await client().get("/api/tags/physics").expect(200);
    expect(tagInfo.body.postsCount).toBe(1);
  });

  it("suggests related posts and series", async () => {
    const { c } = await signUp();
    const series = await c.post("/api/series").send({ title: "Learning Rust" }).expect(201);
    const a = await publishedPost(c, "Rust ownership", { tags: ["rust"], series: series.body._id });
    await publishedPost(c, "Rust borrowing", { tags: ["rust"], series: series.body._id });
    const related = await client().get(`/api/posts/${a._id}/related`).expect(200);
    expect(related.body.items.length).toBeGreaterThan(0);
    const s = await client().get(`/api/series/${series.body._id}`).expect(200);
    expect(s.body.posts).toHaveLength(2);
  });

  it("serves OpenAPI docs", async () => {
    const res = await client().get("/api/openapi.json").expect(200);
    expect(res.body.paths["/api/posts/{id}/publish"].post.summary).toMatch(/Publish/);
  });
});
