import type { Types } from "mongoose";
import { Post, PUBLISHED } from "../models/Post";
import { Follow } from "../models/Follow";
import { User, PUBLIC_USER_FIELDS, type UserDoc } from "../models/User";
import { afterCursor, toPage, type Page } from "../lib/pagination";
import { cache, cacheKeys } from "../lib/cache";
import { notFound } from "../lib/errors";
import { normalizeTag } from "../lib/text";
import { POST_CARD_FIELDS } from "./post.service";

export type FeedKind = "latest" | "trending" | "following";
interface PageOpts {
  cursor?: string;
  limit: number;
}

async function query(filter: Record<string, unknown>, sortField: "publishedAt" | "trendingScore", opts: PageOpts) {
  // $and keeps a filter's own $or (following feed) from clobbering the cursor's $or.
  const conditions = [{ ...PUBLISHED }, filter, afterCursor(sortField, opts.cursor)].filter((c) => Object.keys(c).length);
  const rows = await Post.find({ $and: conditions })
    .select(`${POST_CARD_FIELDS} trendingScore`)
    .sort({ [sortField]: -1, _id: -1 })
    .limit(opts.limit + 1)
    .populate("author", PUBLIC_USER_FIELDS)
    .lean();
  return toPage(rows, opts.limit, sortField);
}

/** The first page of public feeds is cached briefly; later pages always hit Mongo. */
function cachedFirstPage<T>(key: string, opts: PageOpts, load: () => Promise<T>): Promise<T> {
  return opts.cursor ? load() : cache.wrap(`${key}:${opts.limit}`, 30, load);
}

export function latestFeed(opts: PageOpts) {
  return cachedFirstPage(cacheKeys.feed("latest"), opts, () => query({}, "publishedAt", opts));
}

export function trendingFeed(opts: PageOpts) {
  return cachedFirstPage(cacheKeys.feed("trending"), opts, () => query({ trendingScore: { $gt: 0 } }, "trendingScore", opts));
}

/** Posts from people the viewer follows plus posts in tags they follow. */
export async function followingFeed(viewer: UserDoc, opts: PageOpts): Promise<Page<unknown>> {
  const follows = await Follow.find({ follower: viewer._id }).select("following").lean();
  const authors = follows.map((f) => f.following as Types.ObjectId);
  const or: Record<string, unknown>[] = [];
  if (authors.length) or.push({ author: { $in: authors } });
  if (viewer.followedTags.length) or.push({ tags: { $in: viewer.followedTags } });
  if (!or.length) return { items: [], nextCursor: null };
  return query({ $or: or, author: { $ne: viewer._id } }, "publishedAt", opts);
}

export function tagFeed(tag: string, sort: "latest" | "top", opts: PageOpts) {
  const slug = normalizeTag(tag);
  return sort === "top"
    ? query({ tags: slug }, "trendingScore", opts)
    : cachedFirstPage(cacheKeys.feed("tag", slug), opts, () => query({ tags: slug }, "publishedAt", opts));
}

export async function authorFeed(username: string, opts: PageOpts) {
  const user = await User.findOne({ username: username.toLowerCase() }).select("_id");
  if (!user) throw notFound("User");
  return query({ author: user._id }, "publishedAt", opts);
}
