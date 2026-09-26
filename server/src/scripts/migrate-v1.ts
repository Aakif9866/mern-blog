/**
 * Migrates a v1 MERN-blog database to the Klyro v2 schema, in place.
 *
 *   npm run migrate:v1                  # dry run: prints what would change
 *   npm run migrate:v1 -- --apply       # writes the changes
 *
 * Safe to re-run: documents already in v2 shape are skipped.
 * Take a backup (mongodump) before running with --apply on real data.
 */
import mongoose, { Types } from "mongoose";
import { connectDb, disconnectDb } from "../config/db";
import { sanitizePostHtml } from "../lib/sanitize";
import { excerptFrom, normalizeTag, readTimeMinutes } from "../lib/text";
import { Post } from "../models/Post";
import { User } from "../models/User";
import { Comment } from "../models/Comment";
import { Tag } from "../models/Tag";

const APPLY = process.argv.includes("--apply");
const V1_DEFAULT_AVATAR = "blank-profile-picture";
const V1_DEFAULT_COVER = "how-to-write-a-blog-post.png";

const toId = (v: unknown) => (typeof v === "string" && Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : v);

async function migrateUsers() {
  const users = mongoose.connection.collection("users");
  const v1 = await users.find({ $or: [{ role: { $exists: false } }, { profilePicture: { $exists: true } }] }).toArray();
  for (const u of v1) {
    const avatar = typeof u.profilePicture === "string" && !u.profilePicture.includes(V1_DEFAULT_AVATAR) ? u.profilePicture : "";
    const set = {
      role: u.isAdmin ? "admin" : "user",
      status: "active",
      name: u.name ?? u.username,
      avatar,
      bio: "",
      website: "",
      location: "",
      // Existing members signed up before email verification existed.
      emailVerified: true,
      onboarded: true,
      tokenVersion: 0,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      followedTags: [],
      emailPrefs: { comments: true, mentions: true, follows: false, reactions: false, digest: true },
      username: String(u.username).toLowerCase(),
      email: String(u.email).toLowerCase(),
    };
    console.log(`user ${u.username}: role=${set.role}`);
    if (APPLY) await users.updateOne({ _id: u._id }, { $set: set, $unset: { isAdmin: "", profilePicture: "" } });
  }
  return v1.length;
}

async function migratePosts() {
  const posts = mongoose.connection.collection("posts");
  const v1 = await posts.find({ userId: { $exists: true } }).toArray();
  for (const p of v1) {
    const content = sanitizePostHtml(String(p.content ?? ""));
    const category = normalizeTag(String(p.category ?? ""));
    const cover = typeof p.image === "string" && !p.image.includes(V1_DEFAULT_COVER) ? p.image : "";
    const set = {
      author: toId(p.userId),
      content,
      excerpt: excerptFrom(content),
      readTime: readTimeMinutes(content),
      coverImage: cover,
      tags: category && category !== "uncategorized" ? [category] : [],
      status: "published",
      publishedAt: p.createdAt ?? new Date(),
      views: 0,
      likesCount: 0,
      helpfulCount: 0,
      commentsCount: 0,
      bookmarksCount: 0,
      trendingScore: 0,
      tldr: "",
      deletedAt: null,
      series: null,
      seriesOrder: 0,
    };
    console.log(`post "${p.title}": tags=[${set.tags.join(", ")}]`);
    if (APPLY) await posts.updateOne({ _id: p._id }, { $set: set, $unset: { userId: "", category: "", image: "" } });
  }
  if (APPLY) {
    // v1 required unique titles; v2 does not.
    await posts.dropIndex("title_1").catch(() => undefined);
  }
  return v1.length;
}

async function migrateComments() {
  const comments = mongoose.connection.collection("comments");
  const reactions = mongoose.connection.collection("reactions");
  const v1 = await comments.find({ postId: { $exists: true } }).toArray();
  for (const c of v1) {
    const likes: unknown[] = Array.isArray(c.likes) ? c.likes : [];
    if (APPLY) {
      await comments.updateOne(
        { _id: c._id },
        {
          $set: { post: toId(c.postId), author: toId(c.userId), parent: null, root: null, depth: 0, mentions: [], likesCount: likes.length, deletedAt: null },
          $unset: { postId: "", userId: "", likes: "", numberOfLikes: "" },
        }
      );
      for (const userId of likes) {
        await reactions.updateOne(
          { user: toId(userId), target: c._id, type: "like" },
          { $setOnInsert: { user: toId(userId), targetType: "comment", target: c._id, type: "like", createdAt: new Date() } },
          { upsert: true }
        );
      }
    }
  }
  return v1.length;
}

/** Recomputes every denormalized counter from source data. */
async function recount() {
  const published = await Post.find({ status: "published", deletedAt: null }).select("_id author tags").lean();
  const perAuthor = new Map<string, number>();
  const perTag = new Map<string, number>();
  for (const p of published) {
    perAuthor.set(String(p.author), (perAuthor.get(String(p.author)) ?? 0) + 1);
    for (const t of p.tags) perTag.set(t, (perTag.get(t) ?? 0) + 1);
  }
  for (const [author, n] of perAuthor) await User.updateOne({ _id: author }, { postsCount: n });
  for (const [slug, n] of perTag) {
    await Tag.updateOne({ slug }, { $set: { postsCount: n }, $setOnInsert: { slug, name: slug } }, { upsert: true });
  }
  const counts = await Comment.aggregate<{ _id: Types.ObjectId; n: number }>([{ $match: { deletedAt: null } }, { $group: { _id: "$post", n: { $sum: 1 } } }]);
  for (const c of counts) await Post.updateOne({ _id: c._id }, { commentsCount: c.n });
}

async function main() {
  await connectDb();
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN (pass --apply to write)"} on database "${mongoose.connection.name}"\n`);
  const users = await migrateUsers();
  const posts = await migratePosts();
  const comments = await migrateComments();
  if (APPLY) {
    await recount();
    await Promise.all([User.syncIndexes(), Post.syncIndexes(), Comment.syncIndexes(), Tag.syncIndexes()]);
  }
  console.log(`\n${users} users, ${posts} posts, ${comments} comments ${APPLY ? "migrated" : "would be migrated"}.`);
  await disconnectDb();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDb();
  process.exit(1);
});
