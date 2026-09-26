import type { Types } from "mongoose";
import { User, PUBLIC_USER_FIELDS, type UserDoc, type EmailPrefs } from "../models/User";
import { Follow } from "../models/Follow";
import { Post } from "../models/Post";
import { Comment } from "../models/Comment";
import { Reaction } from "../models/Reaction";
import { Bookmark, BookmarkCollection } from "../models/Bookmark";
import { Session } from "../models/Session";
import { Notification } from "../models/Notification";
import { Tag } from "../models/Tag";
import { badRequest, notFound } from "../lib/errors";
import { afterCursor, toPage } from "../lib/pagination";
import { cache, cacheKeys } from "../lib/cache";
import { normalizeTag, escapeRegex } from "../lib/text";
import { notify } from "./notification.service";
import { followTag } from "./tag.service";

type Id = Types.ObjectId | string;

const PROFILE_FIELDS = `${PUBLIC_USER_FIELDS} website location followersCount followingCount postsCount createdAt status`;

export async function getProfile(username: string, viewerId?: Id) {
  const profile = await cache.wrap(cacheKeys.profile(username), 60, () =>
    User.findOne({ username: username.toLowerCase() }).select(PROFILE_FIELDS).lean()
  );
  if (!profile || profile.status === "banned") throw notFound("User");
  const isFollowing = viewerId ? Boolean(await Follow.exists({ follower: viewerId, following: profile._id })) : false;
  const { status: _status, ...rest } = profile;
  return { ...rest, isFollowing, isMe: viewerId ? String(viewerId) === String(profile._id) : false };
}

export async function invalidateProfile(username: string) {
  await cache.del(cacheKeys.profile(username));
}

export async function updateProfile(
  user: UserDoc,
  data: Partial<{ name: string; bio: string; avatar: string; website: string; location: string; username: string; emailPrefs: Partial<EmailPrefs> }>
) {
  const oldUsername = user.username;
  if (data.username && data.username !== user.username) {
    if (await User.exists({ username: data.username, _id: { $ne: user._id } })) throw badRequest("That username is taken");
    user.username = data.username;
  }
  for (const key of ["name", "bio", "avatar", "website", "location"] as const) {
    if (data[key] !== undefined) user[key] = data[key] as string;
  }
  if (data.emailPrefs) user.emailPrefs = { ...user.emailPrefs, ...data.emailPrefs };
  await user.save();
  await invalidateProfile(oldUsername);
  if (oldUsername !== user.username) await invalidateProfile(user.username);
  return user;
}

export async function follow(viewer: UserDoc, username: string) {
  const target = await User.findOne({ username: username.toLowerCase(), status: { $ne: "banned" } }).select("_id username");
  if (!target) throw notFound("User");
  if (String(target._id) === String(viewer._id)) throw badRequest("You can't follow yourself");
  const res = await Follow.updateOne({ follower: viewer._id, following: target._id }, { $setOnInsert: { follower: viewer._id, following: target._id } }, { upsert: true });
  if (res.upsertedCount) {
    await Promise.all([
      User.updateOne({ _id: viewer._id }, { $inc: { followingCount: 1 } }),
      User.updateOne({ _id: target._id }, { $inc: { followersCount: 1 } }),
      notify({ recipient: target._id, actor: viewer._id, type: "follow" }),
    ]);
    await invalidateProfile(target.username);
  }
  return { following: true };
}

export async function unfollow(viewer: UserDoc, username: string) {
  const target = await User.findOne({ username: username.toLowerCase() }).select("_id username");
  if (!target) throw notFound("User");
  const res = await Follow.deleteOne({ follower: viewer._id, following: target._id });
  if (res.deletedCount) {
    await Promise.all([
      User.updateOne({ _id: viewer._id }, { $inc: { followingCount: -1 } }),
      User.updateOne({ _id: target._id }, { $inc: { followersCount: -1 } }),
    ]);
    await invalidateProfile(target.username);
  }
  return { following: false };
}

/** Followers or following of a user, newest first, with whether the viewer follows each one. */
export async function listConnections(username: string, kind: "followers" | "following", opts: { cursor?: string; limit: number }, viewerId?: Id) {
  const user = await User.findOne({ username: username.toLowerCase() }).select("_id");
  if (!user) throw notFound("User");
  const filter = kind === "followers" ? { following: user._id } : { follower: user._id };
  const field = kind === "followers" ? "follower" : "following";
  const rows = await Follow.find({ ...filter, ...afterCursor("createdAt", opts.cursor) })
    .sort({ createdAt: -1, _id: -1 })
    .limit(opts.limit + 1)
    .populate(field, `${PUBLIC_USER_FIELDS} followersCount`)
    .lean();
  const page = toPage(rows, opts.limit, "createdAt");
  const users = page.items.map((r) => r[field] as unknown as { _id: Types.ObjectId }).filter(Boolean);
  const followed = viewerId
    ? new Set((await Follow.find({ follower: viewerId, following: { $in: users.map((u) => u._id) } }).select("following").lean()).map((f) => String(f.following)))
    : new Set<string>();
  return { items: users.map((u) => ({ ...u, isFollowing: followed.has(String(u._id)) })), nextCursor: page.nextCursor };
}

/** Writers to follow: active authors in the viewer's tags that they don't follow yet. */
export async function suggestions(viewer: UserDoc | undefined, limit = 6) {
  const exclude: Id[] = [];
  if (viewer) {
    exclude.push(viewer._id);
    const following = await Follow.find({ follower: viewer._id }).select("following").lean();
    exclude.push(...following.map((f) => f.following));
  }
  const tagFilter = viewer?.followedTags.length ? { tags: { $in: viewer.followedTags } } : {};
  const authors = await Post.aggregate<{ _id: Types.ObjectId; score: number }>([
    { $match: { status: "published", deletedAt: null, author: { $nin: exclude }, ...tagFilter } },
    { $group: { _id: "$author", score: { $sum: { $add: [1, "$likesCount", { $multiply: ["$helpfulCount", 2] }] } } } },
    { $sort: { score: -1 } },
    { $limit: limit },
  ]);
  let users = await User.find({ _id: { $in: authors.map((a) => a._id) }, status: { $ne: "banned" } })
    .select(`${PUBLIC_USER_FIELDS} followersCount`)
    .lean();
  if (users.length < limit) {
    const more = await User.find({ _id: { $nin: [...exclude, ...users.map((u) => u._id)] }, status: "active", postsCount: { $gt: 0 } })
      .sort({ followersCount: -1 })
      .limit(limit - users.length)
      .select(`${PUBLIC_USER_FIELDS} followersCount`)
      .lean();
    users = [...users, ...more];
  }
  return users;
}

export async function completeOnboarding(user: UserDoc, tags: string[], follows: string[]) {
  for (const tag of tags.map(normalizeTag).filter(Boolean).slice(0, 20)) await followTag(user, tag);
  for (const username of follows.slice(0, 20)) await follow(user, username).catch(() => undefined);
  await User.updateOne({ _id: user._id }, { onboarded: true });
}

export async function searchUsers(q: string, limit: number) {
  const rx = new RegExp(`^${escapeRegex(q.toLowerCase())}`, "i");
  return User.find({ status: { $ne: "banned" }, $or: [{ username: rx }, { name: new RegExp(escapeRegex(q), "i") }] })
    .sort({ followersCount: -1 })
    .limit(limit)
    .select(`${PUBLIC_USER_FIELDS} followersCount`)
    .lean();
}

/**
 * Deletes the account. The user's posts and comments are soft-deleted, and their
 * follows, reactions, bookmarks and sessions are removed, with counters fixed up.
 */
export async function deleteAccount(userId: Id) {
  const user = await User.findById(userId);
  if (!user) throw notFound("User");
  const now = new Date();

  const posts = await Post.find({ author: userId, deletedAt: null }).select("_id tags status").lean();
  const published = posts.filter((p) => p.status === "published");
  await Post.updateMany({ author: userId, deletedAt: null }, { deletedAt: now });
  for (const p of published) await Tag.updateMany({ slug: { $in: p.tags } }, { $inc: { postsCount: -1 } });

  const comments = await Comment.find({ author: userId, deletedAt: null }).select("post").lean();
  await Comment.updateMany({ author: userId, deletedAt: null }, { deletedAt: now, content: "[deleted]" });
  const perPost = new Map<string, number>();
  for (const c of comments) perPost.set(String(c.post), (perPost.get(String(c.post)) ?? 0) + 1);
  for (const [postId, n] of perPost) await Post.updateOne({ _id: postId }, { $inc: { commentsCount: -n } });

  const [followingOf, followersOf] = await Promise.all([
    Follow.find({ follower: userId }).select("following").lean(),
    Follow.find({ following: userId }).select("follower").lean(),
  ]);
  await User.updateMany({ _id: { $in: followingOf.map((f) => f.following) } }, { $inc: { followersCount: -1 } });
  await User.updateMany({ _id: { $in: followersOf.map((f) => f.follower) } }, { $inc: { followingCount: -1 } });

  const reactions = await Reaction.find({ user: userId }).select("targetType target type").lean();
  for (const r of reactions) {
    if (r.targetType === "comment") await Comment.updateOne({ _id: r.target }, { $inc: { likesCount: -1 } });
    else await Post.updateOne({ _id: r.target }, { $inc: { [r.type === "helpful" ? "helpfulCount" : "likesCount"]: -1 } });
  }
  const bookmarks = await Bookmark.find({ user: userId }).select("post").lean();
  await Post.updateMany({ _id: { $in: bookmarks.map((b) => b.post) } }, { $inc: { bookmarksCount: -1 } });
  if (user.followedTags.length) await Tag.updateMany({ slug: { $in: user.followedTags } }, { $inc: { followersCount: -1 } });

  await Promise.all([
    Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] }),
    Reaction.deleteMany({ user: userId }),
    Bookmark.deleteMany({ user: userId }),
    BookmarkCollection.deleteMany({ owner: userId }),
    Session.deleteMany({ user: userId }),
    Notification.deleteMany({ $or: [{ recipient: userId }, { actor: userId }] }),
  ]);
  await User.deleteOne({ _id: userId });
  await invalidateProfile(user.username);
}
