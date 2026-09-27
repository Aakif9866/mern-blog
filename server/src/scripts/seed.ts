/**
 * Fills an empty local database with demo users, posts, comments and reactions.
 *   npm run seed            # refuses to run if users already exist
 *   npm run seed -- --force # wipes the database first (never use on real data)
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDb, disconnectDb } from "../config/db";
import { closeRedis } from "../lib/redis";
import { env } from "../config/env";
import { User } from "../models/User";
import { Post, type PostDoc } from "../models/Post";
import { Comment } from "../models/Comment";
import { Reaction } from "../models/Reaction";
import { Follow } from "../models/Follow";
import { Tag } from "../models/Tag";
import { excerptFrom, readTimeMinutes, uniqueSlug } from "../lib/text";
import { localEmbedding } from "../lib/ai/embeddings";
import { htmlToText } from "../lib/sanitize";
import { recomputeTrending } from "../services/post.service";
import { recomputeTrendingTags } from "../services/tag.service";
import { Bookmark } from "../models/Bookmark";
import { Notification } from "../models/Notification";
import { extractMentions } from "../lib/text";
import { members, posts as communityPosts, threads, type SeedComment } from "./seed-community";

const FORCE = process.argv.includes("--force");

const people = [
  { username: "admin", name: "Klyro Admin", role: "admin" as const, bio: "Keeping Klyro running." },
  { username: "maya", name: "Maya Chen", role: "moderator" as const, bio: "Frontend engineer. CSS enthusiast." },
  { username: "arjun", name: "Arjun Rao", role: "user" as const, bio: "Backend, databases and distributed-ish systems." },
  { username: "lena", name: "Lena Fischer", role: "user" as const, bio: "ML engineer writing about practical AI." },
  { username: "sam", name: "Sam Okafor", role: "user" as const, bio: "Learning in public. DSA and career notes." },
];

const posts = [
  {
    by: "maya",
    title: "Building responsive layouts with CSS Grid and clamp()",
    tags: ["css", "webdev", "frontend"],
    body: `<p>Media queries still have their place, but modern CSS lets most layouts adapt on their own. In this post we'll combine <code>grid-template-columns</code> with <code>minmax()</code> and fluid type with <code>clamp()</code>.</p><h2>Auto-fitting cards</h2><pre><code class="language-css">.grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));\n  gap: 1.5rem;\n}</code></pre><p>The <code>min(100%, 18rem)</code> trick keeps a single column from overflowing on very narrow phones.</p><h2>Fluid type</h2><pre><code class="language-css">h1 { font-size: clamp(1.75rem, 1.2rem + 2.5vw, 3rem); }</code></pre><p>Test at 320px, 768px and 1440px and you'll rarely need a breakpoint for typography again.</p>`,
  },
  {
    by: "arjun",
    title: "Cursor pagination in MongoDB, explained",
    tags: ["mongodb", "backend", "javascript"],
    body: `<p>Offset pagination (<code>skip</code>) gets slower the deeper you go and shows duplicates when new rows arrive. Cursor pagination fixes both.</p><h2>The idea</h2><p>Sort by a field plus <code>_id</code> as a tiebreaker, and ask for rows <em>after</em> the last one you saw.</p><pre><code class="language-js">const filter = cursor\n  ? { $or: [{ publishedAt: { $lt: c.v } }, { publishedAt: c.v, _id: { $lt: c.id } }] }\n  : {};\nconst rows = await Post.find(filter).sort({ publishedAt: -1, _id: -1 }).limit(limit + 1);</code></pre><p>Fetch one extra row to know whether there's a next page. Back it with a compound index on <code>{ publishedAt: -1, _id: -1 }</code>.</p>`,
  },
  {
    by: "lena",
    title: "Embeddings for related posts without a vector database",
    tags: ["ai", "machinelearning", "javascript"],
    body: `<p>You don't need a vector database to recommend related articles on a small site. Store an embedding per post and compute cosine similarity over recent candidates.</p><h2>Why it works</h2><p>Embeddings place semantically similar text close together. For a few thousand posts, a linear scan in Node is fast enough.</p><pre><code class="language-ts">function cosine(a: number[], b: number[]) {\n  let dot = 0, na = 0, nb = 0;\n  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }\n  return dot / Math.sqrt(na * nb);\n}</code></pre><p>When you outgrow it, move to Atlas Vector Search.</p>`,
  },
  {
    by: "sam",
    title: "How I prepared for coding interviews in 8 weeks",
    tags: ["dsa", "career"],
    body: `<p>Here's the plan that worked for me, with the resources I actually finished.</p><ol><li><strong>Weeks 1-2:</strong> arrays, strings, hashing.</li><li><strong>Weeks 3-4:</strong> linked lists, stacks, queues, two pointers.</li><li><strong>Weeks 5-6:</strong> trees, graphs, BFS/DFS.</li><li><strong>Weeks 7-8:</strong> dynamic programming and mock interviews.</li></ol><blockquote><p>Consistency beat intensity: 90 minutes a day, every day.</p></blockquote><p>Big thanks to @arjun for the mock interviews.</p>`,
  },
  {
    by: "arjun",
    title: "Refresh token rotation: stop stolen sessions",
    tags: ["security", "backend", "webdev"],
    body: `<p>Long-lived refresh tokens are convenient and dangerous. Rotation limits the damage when one leaks.</p><h2>How rotation works</h2><p>Every refresh returns a <em>new</em> refresh token and invalidates the old one. If an old token is ever presented again, someone replayed it, so revoke the whole session family.</p><ul><li>Store only a hash of each token.</li><li>Keep tokens in httpOnly, SameSite cookies, never localStorage.</li><li>Scope the refresh cookie path to your auth routes.</li></ul>`,
  },
  {
    by: "maya",
    title: "Optimistic UI with TanStack Query",
    tags: ["react", "frontend", "javascript"],
    body: `<p>Optimistic updates make apps feel instant: update the cache first, roll back if the server says no.</p><pre><code class="language-ts">useMutation({\n  mutationFn: toggleLike,\n  onMutate: async () => {\n    await qc.cancelQueries({ queryKey });\n    const prev = qc.getQueryData(queryKey);\n    qc.setQueryData(queryKey, (p) => ({ ...p, liked: !p.liked }));\n    return { prev };\n  },\n  onError: (_e, _v, ctx) => qc.setQueryData(queryKey, ctx.prev),\n});</code></pre>`,
  },
];

async function main() {
  await connectDb();
  if (env.isProd) throw new Error("Refusing to seed in production");
  if (await User.estimatedDocumentCount()) {
    if (!FORCE) throw new Error("Database is not empty. Use --force to wipe it first (local databases only).");
    await mongoose.connection.dropDatabase();
  }
  // Recreate every index (text search, uniques, TTLs) on the fresh database.
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));

  const password = await bcrypt.hash("password123", 12);
  const users = new Map<string, InstanceType<typeof User>>();
  for (const p of people) {
    const u = await User.create({ ...p, email: `${p.username}@klyro.dev`, password, emailVerified: true, onboarded: true });
    users.set(p.username, u);
  }

  const created: PostDoc[] = [];
  for (const [i, p] of posts.entries()) {
    const author = users.get(p.by)!;
    const publishedAt = new Date(Date.now() - (posts.length - i) * 20 * 60 * 60 * 1000);
    created.push(
      await Post.create({
        author: author._id,
        title: p.title,
        slug: uniqueSlug(p.title),
        content: p.body,
        excerpt: excerptFrom(p.body),
        readTime: readTimeMinutes(p.body),
        tags: p.tags,
        status: "published",
        publishedAt,
        views: 20 + i * 13,
        embedding: localEmbedding(`${p.title}\n${p.tags.join(" ")}\n${htmlToText(p.body)}`),
      })
    );
    await User.updateOne({ _id: author._id }, { $inc: { postsCount: 1 } });
    for (const t of p.tags) await Tag.updateOne({ slug: t }, { $setOnInsert: { slug: t, name: t }, $inc: { postsCount: 1 } }, { upsert: true });
  }
  await Post.create({ author: users.get("sam")!._id, title: "Draft: notes on graphs", slug: uniqueSlug("notes on graphs"), content: "<p>Work in progress…</p>", status: "draft" });

  const follow = async (a: string, b: string) => {
    await Follow.create({ follower: users.get(a)!._id, following: users.get(b)!._id });
    await User.updateOne({ _id: users.get(a)!._id }, { $inc: { followingCount: 1 } });
    await User.updateOne({ _id: users.get(b)!._id }, { $inc: { followersCount: 1 } });
  };
  await follow("sam", "arjun");
  await follow("sam", "maya");
  await follow("lena", "arjun");
  await follow("maya", "lena");
  await User.updateOne({ username: "sam" }, { followedTags: ["javascript", "career"] });

  const react = async (who: string, postIdx: number, type: "like" | "helpful") => {
    const post = created[postIdx]!;
    await Reaction.create({ user: users.get(who)!._id, targetType: "post", target: post._id, type });
    await Post.updateOne({ _id: post._id }, { $inc: { [type === "like" ? "likesCount" : "helpfulCount"]: 1 } });
  };
  await react("sam", 1, "helpful");
  await react("lena", 1, "like");
  await react("maya", 4, "helpful");
  await react("sam", 4, "like");
  await react("arjun", 2, "like");

  const c1 = await Comment.create({ post: created[1]!._id, author: users.get("sam")!._id, content: "This finally made cursor pagination click for me, thanks!" });
  await Comment.create({ post: created[1]!._id, author: users.get("arjun")!._id, parent: c1._id, root: c1._id, depth: 1, content: "Glad it helped @sam! Indexes are the part people forget." });
  await Post.updateOne({ _id: created[1]!._id }, { commentsCount: 2 });

  const stats = await seedCommunity(users, password);

  await recomputeTrending();
  await recomputeTrendingTags();
  console.log(
    `Seeded ${users.size} users, ${posts.length + communityPosts.length + 1} posts, ${stats.comments} comments, ${stats.reactions} reactions and ${stats.follows} follows.`
  );
  console.log("Sign in as admin@klyro.dev, maya@klyro.dev or sam@klyro.dev (password: password123).");
  await Promise.all([disconnectDb(), closeRedis()]);
}

/** Small deterministic PRNG so every seed produces the same community. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Fictional members, their posts, threaded discussions and a realistic web of engagement. */
async function seedCommunity(users: Map<string, InstanceType<typeof User>>, password: string) {
  const rand = rng(2026);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)] as T;
  const now = Date.now();
  const interests = new Map<string, string[]>();

  // Members joined 6-10 weeks ago.
  for (const m of members) {
    const u = await User.create({
      username: m.username,
      name: m.name,
      bio: m.bio,
      location: m.location,
      role: m.role ?? "user",
      email: `${m.username}@klyro.dev`,
      password,
      emailVerified: true,
      onboarded: true,
      followedTags: m.interests,
    });
    await User.collection.updateOne({ _id: u._id }, { $set: { createdAt: new Date(now - (42 + rand() * 28) * DAY) } });
    users.set(m.username, u);
    interests.set(m.username, m.interests);
  }
  // The original demo users get interests too, so they join in.
  interests.set("sam", ["careers", "tech", "cricket", "cinema", "question"]);
  interests.set("maya", ["tech", "worldcinema", "food", "travel"]);
  interests.set("arjun", ["tech", "cricket", "tollywood"]);
  interests.set("lena", ["ai", "tech", "books", "hollywood"]);
  await User.updateOne({ username: "sam" }, { $addToSet: { followedTags: { $each: ["cinema", "cricket", "careers"] } } });

  const everyone = [...interests.keys()];
  const nameById = new Map([...users.entries()].map(([name, u]) => [String(u._id), name]));
  const shared = (a: string, tags: string[]) => (interests.get(a) ?? []).some((t) => tags.includes(t));

  // ---- Posts ----
  const created: { doc: PostDoc; by: string; tags: string[]; at: number }[] = [];
  for (const p of communityPosts) {
    const author = users.get(p.by)!;
    const at = now - p.daysAgo * DAY - Math.floor(rand() * 10) * HOUR;
    const doc = await Post.create({
      author: author._id,
      title: p.title,
      slug: uniqueSlug(p.title),
      content: p.body,
      excerpt: excerptFrom(p.body),
      readTime: readTimeMinutes(p.body),
      tags: p.tags,
      status: "published",
      publishedAt: new Date(at),
      embedding: localEmbedding(`${p.title}\n${p.tags.join(" ")}\n${htmlToText(p.body)}`),
    });
    await Post.collection.updateOne({ _id: doc._id }, { $set: { createdAt: new Date(at), updatedAt: new Date(at) } });
    await User.updateOne({ _id: author._id }, { $inc: { postsCount: 1 } });
    for (const t of p.tags) await Tag.updateOne({ slug: t }, { $setOnInsert: { slug: t, name: t }, $inc: { postsCount: 1 } }, { upsert: true });
    created.push({ doc, by: p.by, tags: p.tags, at });
  }

  const notifications: Record<string, unknown>[] = [];
  const notify = (recipient: string, actor: string, type: string, at: number, extra: Record<string, unknown> = {}) => {
    if (recipient === actor) return;
    notifications.push({ recipient: users.get(recipient)!._id, actor: users.get(actor)!._id, type, read: now - at > 3 * DAY, createdAt: new Date(at), ...extra });
  };

  // ---- Comment threads ----
  let comments = 0;
  const addComment = async (post: (typeof created)[number], c: SeedComment, at: number, parent: InstanceType<typeof Comment> | null) => {
    const author = users.get(c.by)!;
    const mentioned = extractMentions(c.text).map((u) => users.get(u)).filter(Boolean) as InstanceType<typeof User>[];
    const doc = await Comment.create({
      post: post.doc._id,
      author: author._id,
      parent: parent?._id ?? null,
      root: parent ? (parent.root ?? parent._id) : null,
      depth: parent ? parent.depth + 1 : 0,
      content: c.text,
      mentions: mentioned.map((u) => u._id),
      likesCount: Math.floor(rand() * 9),
    });
    await Comment.collection.updateOne({ _id: doc._id }, { $set: { createdAt: new Date(at), updatedAt: new Date(at) } });
    comments++;
    if (parent) notify(nameById.get(String(parent.author))!, c.by, "reply", at, { post: post.doc._id, comment: doc._id });
    else notify(post.by, c.by, "comment", at, { post: post.doc._id, comment: doc._id });
    for (const m of mentioned) notify(m.username, c.by, "mention", at, { post: post.doc._id, comment: doc._id });
    let t = at;
    for (const r of c.replies ?? []) {
      t += (1 + rand() * 20) * HOUR;
      await addComment(post, r, Math.min(t, now - HOUR), doc);
    }
  };
  for (const post of created) {
    const thread = threads[post.doc.title] ?? [];
    let t = post.at + 2 * HOUR;
    for (const c of thread) {
      t += (0.5 + rand() * 12) * HOUR;
      await addComment(post, c, Math.min(t, now - 2 * HOUR), null);
    }
    const count = await Comment.countDocuments({ post: post.doc._id });
    await Post.updateOne({ _id: post.doc._id }, { commentsCount: count });
  }

  // ---- Follows: people follow others who share their interests ----
  let follows = 0;
  const followSet = new Set<string>(
    (await Follow.find().lean()).map((f) => `${nameById.get(String(f.follower))}>${nameById.get(String(f.following))}`)
  );
  const follow = async (a: string, b: string) => {
    if (a === b || followSet.has(`${a}>${b}`) || !users.get(a) || !users.get(b)) return;
    followSet.add(`${a}>${b}`);
    await Follow.create({ follower: users.get(a)!._id, following: users.get(b)!._id });
    await User.updateOne({ _id: users.get(a)!._id }, { $inc: { followingCount: 1 } });
    await User.updateOne({ _id: users.get(b)!._id }, { $inc: { followersCount: 1 } });
    notify(b, a, "follow", now - rand() * 30 * DAY);
    follows++;
  };
  for (const a of everyone) {
    for (const b of everyone) {
      if (a === b) continue;
      const overlap = shared(a, interests.get(b) ?? []);
      if (rand() < (overlap ? 0.55 : 0.08)) await follow(a, b);
    }
  }
  for (const b of ["karthik_s", "ananya_iyer", "vikram_rao", "priya_nair", "sravani_r"]) await follow("sam", b);
  for (const b of ["emily_carter", "kenji_watanabe", "divya_raghavan"]) await follow("maya", b);

  // ---- Reactions, views and bookmarks, driven by interest ----
  let reactions = 0;
  for (const post of created) {
    let likes = 0;
    let helpful = 0;
    const helpfulish = post.tags.some((t) => ["careers", "finance", "tech", "ai", "fitness", "health", "education", "question", "vfx", "startups"].includes(t));
    for (const u of everyone) {
      if (u === post.by) continue;
      const interested = shared(u, post.tags);
      const at = Math.min(post.at + rand() * 5 * DAY, now - HOUR);
      if (rand() < (interested ? 0.6 : 0.12)) {
        await Reaction.create({ user: users.get(u)!._id, targetType: "post", target: post.doc._id, type: "like", createdAt: new Date(at) });
        likes++;
        if (now - at < 10 * DAY && rand() < 0.5) notify(post.by, u, "reaction", at, { post: post.doc._id, reaction: "like" });
      }
      if (rand() < (interested && helpfulish ? 0.35 : 0.04)) {
        await Reaction.create({ user: users.get(u)!._id, targetType: "post", target: post.doc._id, type: "helpful", createdAt: new Date(at) });
        helpful++;
      }
      if (interested && rand() < 0.15) await Bookmark.create({ user: users.get(u)!._id, post: post.doc._id });
    }
    reactions += likes + helpful;
    const bookmarksCount = await Bookmark.countDocuments({ post: post.doc._id });
    const ageDays = (now - post.at) / DAY;
    const views = Math.round((likes * 18 + helpful * 25 + 40) * (1 + rand()) + ageDays * 12);
    await Post.updateOne({ _id: post.doc._id }, { likesCount: likes, helpfulCount: helpful, bookmarksCount, views });
  }
  const pick3 = () => pick(created);
  for (let i = 0; i < 4; i++) {
    const post = pick3();
    await Bookmark.updateOne({ user: users.get("sam")!._id, post: post.doc._id }, { $setOnInsert: { user: users.get("sam")!._id, post: post.doc._id } }, { upsert: true });
  }

  for (const post of created) await Post.updateOne({ _id: post.doc._id }, { bookmarksCount: await Bookmark.countDocuments({ post: post.doc._id }) });
  await Notification.collection.insertMany(notifications.map((n) => ({ reaction: undefined, message: undefined, post: null, comment: null, ...n })));
  return { comments, reactions, follows };
}

main()
  .then(() => process.exit(0))
  .catch(async (err) => {
  console.error(err.message ?? err);
  await disconnectDb();
  process.exit(1);
});
