import type { PipelineStage } from "mongoose";
import { Post, PUBLISHED } from "../models/Post";
import { PUBLIC_USER_FIELDS } from "../models/User";
import { env } from "../config/env";
import { POST_CARD_FIELDS } from "./post.service";
import { searchUsers } from "./user.service";
import { searchTags } from "./tag.service";
import { normalizeTag } from "../lib/text";

export type SearchType = "posts" | "users" | "tags";

interface PostSearchOpts {
  q: string;
  tag?: string;
  sort: "relevance" | "latest" | "top";
  page: number;
  limit: number;
}

/**
 * Post search. With ATLAS_SEARCH=true it uses an Atlas Search index named
 * "posts" (fuzzy, typo-tolerant); otherwise MongoDB's built-in $text index.
 * Search results use page numbers: relevance scores don't make stable cursors.
 */
export async function searchPosts(opts: PostSearchOpts) {
  const skip = (opts.page - 1) * opts.limit;
  const tagFilter = opts.tag ? { tags: normalizeTag(opts.tag) } : {};

  if (env.ATLAS_SEARCH) {
    // Mongoose's types only know $meta "textScore"; Atlas Search uses "searchScore".
    const sortStage = (
      opts.sort === "latest" ? { publishedAt: -1 } : opts.sort === "top" ? { likesCount: -1 } : { score: { $meta: "searchScore" } }
    ) as PipelineStage.Sort["$sort"];
    const items = await Post.aggregate([
      {
        $search: {
          index: "posts",
          compound: {
            should: [
              { text: { query: opts.q, path: "title", score: { boost: { value: 5 } }, fuzzy: { maxEdits: 1 } } },
              { text: { query: opts.q, path: ["excerpt", "content", "tags"], fuzzy: { maxEdits: 1 } } },
            ],
            minimumShouldMatch: 1,
          },
        },
      },
      { $match: { status: "published", deletedAt: null, ...tagFilter } },
      { $sort: sortStage },
      { $skip: skip },
      { $limit: opts.limit + 1 },
      { $project: Object.fromEntries(POST_CARD_FIELDS.split(" ").map((f) => [f, 1])) },
      { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "author", pipeline: [{ $project: Object.fromEntries(PUBLIC_USER_FIELDS.split(" ").map((f) => [f, 1])) }] } },
      { $unwind: "$author" },
    ]);
    return { items: items.slice(0, opts.limit), hasMore: items.length > opts.limit, page: opts.page };
  }

  const sort: Record<string, 1 | -1 | { $meta: "textScore" }> =
    opts.sort === "latest" ? { publishedAt: -1 } : opts.sort === "top" ? { likesCount: -1, publishedAt: -1 } : { score: { $meta: "textScore" } };
  const items = await Post.find({ $text: { $search: opts.q }, ...PUBLISHED, ...tagFilter }, { score: { $meta: "textScore" } })
    .select(POST_CARD_FIELDS)
    .sort(sort)
    .skip(skip)
    .limit(opts.limit + 1)
    .populate("author", PUBLIC_USER_FIELDS)
    .lean();
  return { items: items.slice(0, opts.limit), hasMore: items.length > opts.limit, page: opts.page };
}

export async function searchAll(q: string) {
  const [posts, users, tags] = await Promise.all([
    searchPosts({ q, sort: "relevance", page: 1, limit: 5 }),
    searchUsers(q, 5),
    searchTags(q, 8),
  ]);
  return { posts: posts.items, users, tags };
}
