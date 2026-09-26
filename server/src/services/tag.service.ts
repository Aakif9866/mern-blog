import { Tag } from "../models/Tag";
import { User, type UserDoc } from "../models/User";
import { Post } from "../models/Post";
import { notFound } from "../lib/errors";
import { cache, cacheKeys } from "../lib/cache";
import { escapeRegex, normalizeTag } from "../lib/text";

/** Makes sure Tag rows exist for these slugs and adjusts their post counts. */
export async function adjustTagCounts(slugs: string[], delta: 1 | -1): Promise<void> {
  if (!slugs.length) return;
  if (delta > 0) {
    await Tag.bulkWrite(
      slugs.map((slug) => ({
        updateOne: { filter: { slug }, update: { $setOnInsert: { slug, name: slug }, $inc: { postsCount: 1 } }, upsert: true },
      }))
    );
  } else {
    await Tag.updateMany({ slug: { $in: slugs } }, { $inc: { postsCount: -1 } });
  }
}

export async function getTag(slug: string, viewer?: UserDoc) {
  const tag = await Tag.findOne({ slug: normalizeTag(slug) }).lean();
  if (!tag) throw notFound("Tag");
  return { ...tag, isFollowing: viewer ? viewer.followedTags.includes(tag.slug) : false };
}

export async function followTag(user: UserDoc, slug: string) {
  const tag = normalizeTag(slug);
  if (!tag) throw notFound("Tag");
  const res = await User.updateOne({ _id: user._id, followedTags: { $ne: tag } }, { $push: { followedTags: tag } });
  if (res.modifiedCount) {
    await Tag.updateOne({ slug: tag }, { $setOnInsert: { slug: tag, name: tag }, $inc: { followersCount: 1 } }, { upsert: true });
    user.followedTags.push(tag);
  }
  return { following: true };
}

export async function unfollowTag(user: UserDoc, slug: string) {
  const tag = normalizeTag(slug);
  const res = await User.updateOne({ _id: user._id }, { $pull: { followedTags: tag } });
  if (res.modifiedCount) {
    await Tag.updateOne({ slug: tag }, { $inc: { followersCount: -1 } });
    user.followedTags = user.followedTags.filter((t) => t !== tag);
  }
  return { following: false };
}

export function popularTags(limit: number) {
  return Tag.find({ postsCount: { $gt: 0 } }).sort({ postsCount: -1 }).limit(limit).lean();
}

export function trendingTags(limit = 10) {
  return cache.wrap(`${cacheKeys.trendingTags()}:${limit}`, 300, async () => {
    const trending = await Tag.find({ trendingScore: { $gt: 0 } }).sort({ trendingScore: -1 }).limit(limit).lean();
    return trending.length ? trending : popularTags(limit);
  });
}

export function searchTags(q: string, limit: number) {
  const rx = new RegExp(`^${escapeRegex(normalizeTag(q) || q.toLowerCase())}`);
  return Tag.find({ slug: rx }).sort({ postsCount: -1 }).limit(limit).lean();
}

/** Scores tags by activity on posts published in the last 7 days. */
export async function recomputeTrendingTags(): Promise<void> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const scores = await Post.aggregate<{ _id: string; score: number }>([
    { $match: { status: "published", deletedAt: null, publishedAt: { $gte: since } } },
    { $unwind: "$tags" },
    {
      $group: {
        _id: "$tags",
        score: { $sum: { $add: [3, { $multiply: ["$views", 0.05] }, "$likesCount", { $multiply: ["$helpfulCount", 2] }, "$commentsCount"] } },
      },
    },
  ]);
  await Tag.updateMany({}, { trendingScore: 0 });
  if (scores.length) {
    await Tag.bulkWrite(scores.map((s) => ({ updateOne: { filter: { slug: s._id }, update: { trendingScore: Math.round(s.score * 100) / 100 } } })));
  }
  await cache.delPrefix(cacheKeys.trendingTags());
}
