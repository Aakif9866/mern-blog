import { Types } from "mongoose";
import { Post, PUBLISHED, type IPost, type PostDoc, type PostStatus } from "../models/Post";
import { PostRevision } from "../models/PostRevision";
import { Series } from "../models/Series";
import { User, PUBLIC_USER_FIELDS, type UserDoc } from "../models/User";
import { Reaction } from "../models/Reaction";
import { Bookmark } from "../models/Bookmark";
import { Follow } from "../models/Follow";
import { badRequest, forbidden, notFound } from "../lib/errors";
import { sanitizePostHtml, htmlToText } from "../lib/sanitize";
import { excerptFrom, extractMentions, normalizeTag, readTimeMinutes, slugify, uniqueSlug } from "../lib/text";
import { afterCursor, toPage } from "../lib/pagination";
import { cache, cacheKeys } from "../lib/cache";
import { getRedis, redisReady } from "../lib/redis";
import { enqueue } from "../lib/queue";
import { cosine } from "../lib/ai/embeddings";
import { hasRole } from "../middleware/auth";
import { adjustTagCounts } from "./tag.service";
import { notify } from "./notification.service";

type Id = Types.ObjectId | string;

export const POST_CARD_FIELDS =
  "author title slug excerpt coverImage tags readTime views likesCount helpfulCount commentsCount bookmarksCount status publishedAt scheduledFor createdAt updatedAt editedAt series";
const AUTHOR_POPULATE = { path: "author", select: PUBLIC_USER_FIELDS };
export const MAX_TAGS = 5;

export interface PublicAuthor {
  _id: Types.ObjectId;
  username: string;
  name: string;
  avatar: string;
  bio: string;
  role: string;
}

export type PostDetail = Omit<IPost, "author" | "series" | "embedding"> & {
  author: PublicAuthor;
  series: { _id: Types.ObjectId; title: string; slug: string } | null;
};

export interface PostInput {
  title?: string;
  content?: string;
  coverImage?: string;
  tags?: string[];
  series?: string | null;
  seriesOrder?: number;
}

function cleanTags(tags: string[]): string[] {
  return [...new Set(tags.map(normalizeTag).filter(Boolean))].slice(0, MAX_TAGS);
}

function canManage(post: { author: unknown }, user: UserDoc | undefined): boolean {
  if (!user) return false;
  return String(post.author) === String(user._id) || hasRole(user.role, "moderator");
}

async function findOwnPost(postId: string, user: UserDoc): Promise<PostDoc> {
  if (!Types.ObjectId.isValid(postId)) throw notFound("Post");
  const post = await Post.findOne({ _id: postId, deletedAt: null });
  if (!post) throw notFound("Post");
  if (String(post.author) !== String(user._id)) throw forbidden("Only the author can edit this post");
  return post;
}

async function assertOwnSeries(seriesId: string | null | undefined, user: UserDoc) {
  if (!seriesId) return null;
  const series = await Series.findOne({ _id: seriesId, author: user._id }).select("_id");
  if (!series) throw badRequest("Series not found");
  return series._id;
}

function applyContent(post: PostDoc, input: PostInput) {
  if (input.title !== undefined) post.title = input.title.trim();
  if (input.content !== undefined) {
    post.content = sanitizePostHtml(input.content);
    post.excerpt = excerptFrom(post.content);
    post.readTime = readTimeMinutes(post.content);
  }
  if (input.coverImage !== undefined) post.coverImage = input.coverImage;
  if (input.tags !== undefined) post.tags = cleanTags(input.tags);
  if (input.seriesOrder !== undefined) post.seriesOrder = input.seriesOrder;
}

export async function invalidatePostCaches(slug?: string) {
  await Promise.all([slug ? cache.del(cacheKeys.post(slug)) : Promise.resolve(), cache.delPrefix("feed:")]);
}

export async function createPost(user: UserDoc, input: PostInput) {
  const post = new Post({ author: user._id, slug: uniqueSlug(input.title || "untitled") });
  applyContent(post, input);
  if (input.series) post.series = await assertOwnSeries(input.series, user);
  await post.save();
  return post;
}

/**
 * Updates a post. Drafts are autosaved in place; edits to a published post
 * snapshot the previous version into the edit history first.
 */
export async function updatePost(postId: string, user: UserDoc, input: PostInput) {
  const post = await findOwnPost(postId, user);
  const oldTags = [...post.tags];
  const contentChanged =
    (input.title !== undefined && input.title.trim() !== post.title) ||
    (input.content !== undefined && sanitizePostHtml(input.content) !== post.content);

  if (post.status === "published" && contentChanged) {
    await PostRevision.create({ post: post._id, editor: user._id, title: post.title, content: post.content, tags: post.tags });
    post.editedAt = new Date();
  }
  applyContent(post, input);
  if (input.series !== undefined) post.series = await assertOwnSeries(input.series, user);
  if (post.status === "published" && !post.title) throw badRequest("A published post needs a title");
  await post.save();

  if (post.status === "published") {
    const added = post.tags.filter((t) => !oldTags.includes(t));
    const removed = oldTags.filter((t) => !post.tags.includes(t));
    await adjustTagCounts(added, 1);
    await adjustTagCounts(removed, -1);
    await invalidatePostCaches(post.slug);
    if (contentChanged) await enqueue("post:enrich", { postId: String(post._id) });
  }
  return post;
}

/** Publishes now, or schedules for later when scheduledFor is in the future. */
export async function publishPost(postId: string, user: UserDoc, scheduledFor?: Date | null) {
  const post = await findOwnPost(postId, user);
  if (post.status === "published") throw badRequest("Post is already published");
  if (!post.title.trim()) throw badRequest("Add a title before publishing");
  if (htmlToText(post.content).length < 20) throw badRequest("Write a little more before publishing");

  if (scheduledFor && scheduledFor.getTime() > Date.now() + 60_000) {
    post.status = "scheduled";
    post.scheduledFor = scheduledFor;
    await post.save();
    return post;
  }
  return goLive(post);
}

export async function unschedulePost(postId: string, user: UserDoc) {
  const post = await findOwnPost(postId, user);
  if (post.status !== "scheduled") throw badRequest("Post is not scheduled");
  post.status = "draft";
  post.scheduledFor = null;
  await post.save();
  return post;
}

async function goLive(post: PostDoc) {
  const firstPublish = !post.publishedAt;
  if (firstPublish) post.slug = uniqueSlug(post.title);
  post.status = "published";
  post.publishedAt = new Date();
  post.scheduledFor = null;
  await post.save();

  await Promise.all([adjustTagCounts(post.tags, 1), User.updateOne({ _id: post.author }, { $inc: { postsCount: 1 } })]);
  await invalidatePostCaches(post.slug);
  await enqueue("post:enrich", { postId: String(post._id) });
  if (firstPublish) await notifyPostMentions(post);
  return post;
}

async function notifyPostMentions(post: PostDoc) {
  const usernames = extractMentions(htmlToText(post.content)).slice(0, 20);
  if (!usernames.length) return;
  const users = await User.find({ username: { $in: usernames } }).select("_id").lean();
  for (const u of users) await notify({ recipient: u._id, actor: post.author, type: "mention", post: post._id });
}

/** Job: publish scheduled posts whose time has come. */
export async function publishDueScheduled(): Promise<number> {
  const due = await Post.find({ status: "scheduled", deletedAt: null, scheduledFor: { $lte: new Date() } }).limit(100);
  for (const post of due) await goLive(post);
  return due.length;
}

export async function unpublishPost(postId: string, user: UserDoc) {
  const post = await findOwnPost(postId, user);
  if (post.status !== "published") throw badRequest("Post is not published");
  post.status = "draft";
  await post.save();
  await Promise.all([adjustTagCounts(post.tags, -1), User.updateOne({ _id: post.author }, { $inc: { postsCount: -1 } })]);
  await invalidatePostCaches(post.slug);
  return post;
}

/** Soft delete. Authors can delete their own posts; moderators and admins can delete any. */
export async function deletePost(postId: string, user: UserDoc) {
  if (!Types.ObjectId.isValid(postId)) throw notFound("Post");
  const post = await Post.findOne({ _id: postId, deletedAt: null });
  if (!post) throw notFound("Post");
  if (!canManage(post, user)) throw forbidden("You can't delete this post");
  await softDelete(post);
}

export async function softDelete(post: PostDoc) {
  const wasPublished = post.status === "published";
  post.deletedAt = new Date();
  await post.save();
  if (wasPublished) {
    await Promise.all([adjustTagCounts(post.tags, -1), User.updateOne({ _id: post.author }, { $inc: { postsCount: -1 } })]);
  }
  await invalidatePostCaches(post.slug);
}

/** A readable post: published for everyone, drafts/scheduled only for the author and moderators. */
export async function getPostBySlug(slug: string, viewer?: UserDoc) {
  const cached = await cache.get<Record<string, unknown>>(cacheKeys.post(slug));
  const post =
    cached ??
    (await Post.findOne({ slug, deletedAt: null })
      .populate(AUTHOR_POPULATE)
      .populate("series", "title slug")
      .lean());
  if (!post) throw notFound("Post");
  const author = post.author as unknown as { _id: Types.ObjectId };
  if (post.status !== "published" && !canManage({ author: author._id }, viewer)) throw notFound("Post");
  if (!cached && post.status === "published") await cache.set(cacheKeys.post(slug), post, 60);
  return post as unknown as PostDetail;
}

export async function getPostForEdit(postId: string, user: UserDoc) {
  const post = await findOwnPost(postId, user);
  return Post.findById(post._id).populate("series", "title slug").lean();
}

/** What the current viewer has done with a post: reactions, bookmark, following the author. */
export async function viewerState(postId: Id, authorId: Id, viewer?: UserDoc) {
  if (!viewer) return { liked: false, helpful: false, bookmarked: false, followingAuthor: false };
  const [reactions, bookmark, follow] = await Promise.all([
    Reaction.find({ user: viewer._id, target: postId }).select("type").lean(),
    Bookmark.findOne({ user: viewer._id, post: postId }).select("list").lean(),
    Follow.exists({ follower: viewer._id, following: authorId }),
  ]);
  return {
    liked: reactions.some((r) => r.type === "like"),
    helpful: reactions.some((r) => r.type === "helpful"),
    bookmarked: Boolean(bookmark),
    bookmarkList: bookmark?.list ?? null,
    followingAuthor: Boolean(follow),
  };
}

const recentViews = new Map<string, number>();
const VIEW_WINDOW_MS = 6 * 60 * 60 * 1000;

/** Counts at most one view per viewer per post every 6 hours. */
export async function recordView(postId: string, viewerKey: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(postId)) return false;
  const key = `view:${postId}:${viewerKey}`;
  const redis = getRedis();
  let fresh: boolean;
  if (redis && redisReady()) {
    fresh = (await redis.set(key, "1", "PX", VIEW_WINDOW_MS, "NX")) === "OK";
  } else {
    const now = Date.now();
    const seen = recentViews.get(key);
    fresh = !seen || now - seen > VIEW_WINDOW_MS;
    if (fresh) recentViews.set(key, now);
    if (recentViews.size > 50_000) recentViews.clear();
  }
  if (fresh) await Post.updateOne({ _id: postId, ...PUBLISHED }, { $inc: { views: 1 } });
  return fresh;
}

export async function listRevisions(postId: string, user: UserDoc) {
  const post = await Post.findById(postId).select("author");
  if (!post || !canManage(post, user)) throw notFound("Post");
  return PostRevision.find({ post: postId }).sort({ createdAt: -1 }).limit(50).populate("editor", PUBLIC_USER_FIELDS).lean();
}

export async function myPosts(user: UserDoc, status: PostStatus | undefined, opts: { cursor?: string; limit: number }) {
  const rows = await Post.find({
    author: user._id,
    deletedAt: null,
    ...(status ? { status } : {}),
    ...afterCursor("updatedAt", opts.cursor),
  })
    .select(POST_CARD_FIELDS)
    .sort({ updatedAt: -1, _id: -1 })
    .limit(opts.limit + 1)
    .populate("series", "title slug")
    .lean();
  return toPage(rows, opts.limit, "updatedAt");
}

/** Related posts by embedding similarity, falling back to shared tags. */
export async function relatedPosts(postId: string, limit = 4) {
  const post = await Post.findById(postId).select("embedding tags author").lean();
  if (!post) throw notFound("Post");

  if (post.embedding?.length) {
    const candidates = await Post.find({ ...PUBLISHED, _id: { $ne: post._id }, "embedding.0": { $exists: true } })
      .select("_id embedding")
      .sort({ publishedAt: -1 })
      .limit(500)
      .lean();
    const ranked = candidates
      .map((c) => ({ id: c._id, score: cosine(post.embedding as number[], c.embedding as number[]) }))
      .filter((c) => c.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    if (ranked.length) {
      const docs = await Post.find({ _id: { $in: ranked.map((r) => r.id) } }).select(POST_CARD_FIELDS).populate(AUTHOR_POPULATE).lean();
      const byId = new Map(docs.map((d) => [String(d._id), d]));
      return ranked.map((r) => byId.get(String(r.id))).filter(Boolean);
    }
  }

  return Post.find({ ...PUBLISHED, _id: { $ne: post._id }, tags: { $in: post.tags } })
    .select(POST_CARD_FIELDS)
    .sort({ trendingScore: -1, publishedAt: -1 })
    .limit(limit)
    .populate(AUTHOR_POPULATE)
    .lean();
}

// ---- Series ----

export async function createSeries(user: UserDoc, input: { title: string; description?: string }) {
  const base = slugify(input.title) || "series";
  let slug = base;
  for (let i = 2; await Series.exists({ author: user._id, slug }); i++) slug = `${base}-${i}`;
  return Series.create({ author: user._id, title: input.title, description: input.description ?? "", slug });
}

export function listSeriesByAuthor(authorId: Id) {
  return Series.find({ author: authorId }).sort({ createdAt: -1 }).lean();
}

export async function getSeries(seriesId: string, viewer?: UserDoc) {
  if (!Types.ObjectId.isValid(seriesId)) throw notFound("Series");
  const series = await Series.findById(seriesId).populate("author", PUBLIC_USER_FIELDS).lean();
  if (!series) throw notFound("Series");
  const isOwner = viewer && String((series.author as unknown as { _id: Types.ObjectId })._id) === String(viewer._id);
  const posts = await Post.find({ series: series._id, deletedAt: null, ...(isOwner ? {} : { status: "published" }) })
    .select("title slug status readTime publishedAt seriesOrder")
    .sort({ seriesOrder: 1, publishedAt: 1 })
    .lean();
  return { ...series, posts };
}

export async function updateSeries(seriesId: string, user: UserDoc, input: { title?: string; description?: string }) {
  const series = await Series.findOne({ _id: seriesId, author: user._id });
  if (!series) throw notFound("Series");
  if (input.title) series.title = input.title;
  if (input.description !== undefined) series.description = input.description;
  await series.save();
  return series;
}

export async function deleteSeries(seriesId: string, user: UserDoc) {
  const res = await Series.deleteOne({ _id: seriesId, author: user._id });
  if (!res.deletedCount) throw notFound("Series");
  await Post.updateMany({ series: seriesId }, { series: null });
}

// ---- Trending ----

/** Score = engagement decayed by age (hours), recomputed for the last 30 days of posts. */
export async function recomputeTrending(): Promise<void> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const posts = await Post.find({ ...PUBLISHED, publishedAt: { $gte: since } })
    .select("views likesCount helpfulCount commentsCount bookmarksCount publishedAt")
    .lean();
  const now = Date.now();
  const ops = posts.map((p) => {
    const hours = (now - (p.publishedAt ?? new Date()).getTime()) / 3_600_000;
    const engagement = p.views * 0.1 + p.likesCount + p.helpfulCount * 2 + p.commentsCount * 1.5 + p.bookmarksCount * 1.5;
    const score = (engagement + 1) / Math.pow(hours + 2, 1.5);
    return { updateOne: { filter: { _id: p._id }, update: { trendingScore: Math.round(score * 10_000) / 10_000 } } };
  });
  await Post.updateMany({ ...PUBLISHED, publishedAt: { $lt: since }, trendingScore: { $gt: 0 } }, { trendingScore: 0 });
  if (ops.length) await Post.bulkWrite(ops);
  await cache.delPrefix("feed:trending");
}
