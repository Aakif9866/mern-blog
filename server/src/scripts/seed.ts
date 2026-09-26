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

  await recomputeTrending();
  await recomputeTrendingTags();
  console.log(`Seeded ${people.length} users and ${posts.length + 1} posts. Sign in as admin@klyro.dev / password123`);
  await Promise.all([disconnectDb(), closeRedis()]);
}

main()
  .then(() => process.exit(0))
  .catch(async (err) => {
  console.error(err.message ?? err);
  await disconnectDb();
  process.exit(1);
});
