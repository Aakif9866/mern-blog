import { Types } from "mongoose";
import { Post, PUBLISHED } from "../models/Post";
import { Reaction, type ReactionType } from "../models/Reaction";
import { Bookmark, BookmarkCollection } from "../models/Bookmark";
import { PUBLIC_USER_FIELDS, type UserDoc } from "../models/User";
import { badRequest, notFound } from "../lib/errors";
import { afterCursor, toPage } from "../lib/pagination";
import { cache, cacheKeys } from "../lib/cache";
import { notify } from "./notification.service";
import { POST_CARD_FIELDS } from "./post.service";

const COUNT_FIELD: Record<ReactionType, "likesCount" | "helpfulCount"> = { like: "likesCount", helpful: "helpfulCount" };

async function publishedPost(postId: string) {
  if (!Types.ObjectId.isValid(postId)) throw notFound("Post");
  const post = await Post.findOne({ _id: postId, ...PUBLISHED }).select("author slug");
  if (!post) throw notFound("Post");
  return post;
}

/** Toggles a Like or Helpful reaction on a post. */
export async function togglePostReaction(user: UserDoc, postId: string, type: ReactionType) {
  const post = await publishedPost(postId);
  const field = COUNT_FIELD[type];
  const removed = await Reaction.findOneAndDelete({ user: user._id, target: post._id, type });
  let active: boolean;
  if (removed) {
    active = false;
    await Post.updateOne({ _id: post._id }, { $inc: { [field]: -1 } });
  } else {
    try {
      await Reaction.create({ user: user._id, targetType: "post", target: post._id, type });
    } catch (err) {
      // A double-click raced us to the unique index; treat it as already reacted.
      if ((err as { code?: number }).code !== 11000) throw err;
    }
    active = true;
    await Post.updateOne({ _id: post._id }, { $inc: { [field]: 1 } });
    await notify({ recipient: post.author, actor: user._id, type: "reaction", post: post._id, reaction: type });
  }
  await cache.del(cacheKeys.post(post.slug));
  const counts = await Post.findById(post._id).select("likesCount helpfulCount").lean();
  return { type, active, likesCount: counts?.likesCount ?? 0, helpfulCount: counts?.helpfulCount ?? 0 };
}

async function ownCollection(user: UserDoc, listId: string | null | undefined) {
  if (!listId) return null;
  const list = await BookmarkCollection.findOne({ _id: listId, owner: user._id }).select("_id");
  if (!list) throw badRequest("Collection not found");
  return list._id;
}

export async function addBookmark(user: UserDoc, postId: string, listId?: string | null) {
  const post = await publishedPost(postId);
  const list = await ownCollection(user, listId);
  const res = await Bookmark.updateOne({ user: user._id, post: post._id }, { $set: { list }, $setOnInsert: { user: user._id, post: post._id } }, { upsert: true });
  if (res.upsertedCount) await Post.updateOne({ _id: post._id }, { $inc: { bookmarksCount: 1 } });
  return { bookmarked: true, list };
}

export async function removeBookmark(user: UserDoc, postId: string) {
  if (!Types.ObjectId.isValid(postId)) throw notFound("Post");
  const res = await Bookmark.deleteOne({ user: user._id, post: postId });
  if (res.deletedCount) await Post.updateOne({ _id: postId }, { $inc: { bookmarksCount: -1 } });
  return { bookmarked: false };
}

/** Saved posts, optionally in one collection ("none" = not in any collection). */
export async function listBookmarks(user: UserDoc, opts: { list?: string; cursor?: string; limit: number }) {
  const listFilter = opts.list === undefined ? {} : { list: opts.list === "none" ? null : opts.list };
  const rows = await Bookmark.find({ user: user._id, ...listFilter, ...afterCursor("createdAt", opts.cursor) })
    .sort({ createdAt: -1, _id: -1 })
    .limit(opts.limit + 1)
    .populate({
      path: "post",
      select: `${POST_CARD_FIELDS} deletedAt`,
      populate: { path: "author", select: PUBLIC_USER_FIELDS },
    })
    .lean();
  const page = toPage(rows, opts.limit, "createdAt");
  return {
    items: page.items
      .filter((b) => b.post && !(b.post as unknown as { deletedAt?: Date }).deletedAt)
      .map((b) => ({ ...(b.post as unknown as object), bookmarkedAt: b.createdAt, list: b.list })),
    nextCursor: page.nextCursor,
  };
}

export async function listCollections(user: UserDoc) {
  const [lists, counts] = await Promise.all([
    BookmarkCollection.find({ owner: user._id }).sort({ createdAt: -1 }).lean(),
    Bookmark.aggregate<{ _id: Types.ObjectId | null; n: number }>([{ $match: { user: user._id } }, { $group: { _id: "$list", n: { $sum: 1 } } }]),
  ]);
  const byList = new Map(counts.map((c) => [String(c._id), c.n]));
  return {
    total: counts.reduce((s, c) => s + c.n, 0),
    unsorted: byList.get("null") ?? 0,
    collections: lists.map((l) => ({ ...l, count: byList.get(String(l._id)) ?? 0 })),
  };
}

export function createCollection(user: UserDoc, input: { name: string; description?: string }) {
  return BookmarkCollection.create({ owner: user._id, name: input.name, description: input.description ?? "" });
}

export async function updateCollection(user: UserDoc, id: string, input: { name?: string; description?: string }) {
  const list = await BookmarkCollection.findOneAndUpdate({ _id: id, owner: user._id }, input, { returnDocument: "after" });
  if (!list) throw notFound("Collection");
  return list;
}

/** Deleting a collection keeps its bookmarks; they move back to "Saved". */
export async function deleteCollection(user: UserDoc, id: string) {
  const res = await BookmarkCollection.deleteOne({ _id: id, owner: user._id });
  if (!res.deletedCount) throw notFound("Collection");
  await Bookmark.updateMany({ user: user._id, list: id }, { list: null });
}
