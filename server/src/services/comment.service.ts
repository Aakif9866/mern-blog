import { Types } from "mongoose";
import { Comment } from "../models/Comment";
import { Post, PUBLISHED } from "../models/Post";
import { User, PUBLIC_USER_FIELDS, type UserDoc } from "../models/User";
import { Reaction } from "../models/Reaction";
import { badRequest, forbidden, notFound } from "../lib/errors";
import { afterCursor, toPage } from "../lib/pagination";
import { extractMentions } from "../lib/text";
import { hasRole } from "../middleware/auth";
import { notify } from "./notification.service";

/** Replies nest visually up to this depth; deeper replies attach to the deepest allowed parent. */
export const MAX_DEPTH = 4;

async function resolveMentions(text: string, exclude: string) {
  const usernames = extractMentions(text).slice(0, 10);
  if (!usernames.length) return [];
  const users = await User.find({ username: { $in: usernames }, status: { $ne: "banned" } }).select("_id").lean();
  return users.map((u) => u._id).filter((id) => String(id) !== exclude);
}

export async function createComment(user: UserDoc, postId: string, content: string, parentId?: string | null) {
  if (!Types.ObjectId.isValid(postId)) throw notFound("Post");
  const post = await Post.findOne({ _id: postId, ...PUBLISHED }).select("author");
  if (!post) throw notFound("Post");

  let parent = null;
  if (parentId) {
    parent = await Comment.findOne({ _id: parentId, post: post._id });
    if (!parent) throw badRequest("The comment you're replying to no longer exists");
    // Beyond MAX_DEPTH, reply to the parent's parent so threads stay readable on phones.
    while (parent.depth >= MAX_DEPTH && parent.parent) {
      const up: typeof parent | null = await Comment.findById(parent.parent);
      if (!up) break;
      parent = up;
    }
  }

  const mentions = await resolveMentions(content, String(user._id));
  const comment = await Comment.create({
    post: post._id,
    author: user._id,
    parent: parent?._id ?? null,
    root: parent ? (parent.root ?? parent._id) : null,
    depth: parent ? parent.depth + 1 : 0,
    content,
    mentions,
  });
  await Post.updateOne({ _id: post._id }, { $inc: { commentsCount: 1 } });

  const notified = new Set<string>([String(user._id)]);
  if (parent && !notified.has(String(parent.author))) {
    notified.add(String(parent.author));
    await notify({ recipient: parent.author, actor: user._id, type: "reply", post: post._id, comment: comment._id });
  }
  if (!notified.has(String(post.author))) {
    notified.add(String(post.author));
    await notify({ recipient: post.author, actor: user._id, type: "comment", post: post._id, comment: comment._id });
  }
  for (const m of mentions) {
    if (notified.has(String(m))) continue;
    notified.add(String(m));
    await notify({ recipient: m, actor: user._id, type: "mention", post: post._id, comment: comment._id });
  }

  return Comment.findById(comment._id).populate("author", PUBLIC_USER_FIELDS).lean();
}

/**
 * A page of top-level comments (newest first) with every reply in those threads.
 * The client builds the tree from parent ids.
 */
export async function listComments(postId: string, opts: { cursor?: string; limit: number }, viewer?: UserDoc) {
  if (!Types.ObjectId.isValid(postId)) throw notFound("Post");
  const roots = await Comment.find({ post: postId, parent: null, ...afterCursor("createdAt", opts.cursor) })
    .sort({ createdAt: -1, _id: -1 })
    .limit(opts.limit + 1)
    .populate("author", PUBLIC_USER_FIELDS)
    .lean();
  const page = toPage(roots, opts.limit, "createdAt");
  const replies = await Comment.find({ root: { $in: page.items.map((r) => r._id) } })
    .sort({ createdAt: 1 })
    .populate("author", PUBLIC_USER_FIELDS)
    .lean();

  const all = [...page.items, ...replies];
  const liked = viewer
    ? new Set(
        (await Reaction.find({ user: viewer._id, targetType: "comment", target: { $in: all.map((c) => c._id) } }).select("target").lean()).map(
          (r) => String(r.target)
        )
      )
    : new Set<string>();

  const shape = (c: (typeof all)[number]) => {
    const deleted = Boolean(c.deletedAt);
    return {
      ...c,
      content: deleted ? "" : c.content,
      author: deleted ? null : c.author,
      deleted,
      liked: liked.has(String(c._id)),
    };
  };
  return { items: page.items.map(shape), replies: replies.map(shape), nextCursor: page.nextCursor };
}

export async function editComment(user: UserDoc, commentId: string, content: string) {
  const comment = await Comment.findOne({ _id: commentId, deletedAt: null });
  if (!comment) throw notFound("Comment");
  if (String(comment.author) !== String(user._id)) throw forbidden("You can only edit your own comments");
  comment.content = content;
  comment.editedAt = new Date();
  comment.mentions = await resolveMentions(content, String(user._id));
  await comment.save();
  return Comment.findById(comment._id).populate("author", PUBLIC_USER_FIELDS).lean();
}

/** Soft delete keeps the thread intact; the body is hidden and shown as "deleted". */
export async function deleteComment(user: UserDoc, commentId: string) {
  const comment = await Comment.findOne({ _id: commentId, deletedAt: null });
  if (!comment) throw notFound("Comment");
  if (String(comment.author) !== String(user._id) && !hasRole(user.role, "moderator")) throw forbidden("You can't delete this comment");
  await removeComment(comment._id);
}

export async function removeComment(commentId: Types.ObjectId | string) {
  const comment = await Comment.findOneAndUpdate({ _id: commentId, deletedAt: null }, { deletedAt: new Date() });
  if (comment) await Post.updateOne({ _id: comment.post }, { $inc: { commentsCount: -1 } });
}

export async function toggleCommentLike(user: UserDoc, commentId: string) {
  const comment = await Comment.findOne({ _id: commentId, deletedAt: null }).select("_id");
  if (!comment) throw notFound("Comment");
  const existing = await Reaction.findOneAndDelete({ user: user._id, target: comment._id, type: "like" });
  if (existing) {
    const updated = await Comment.findByIdAndUpdate(comment._id, { $inc: { likesCount: -1 } }, { returnDocument: "after" }).select("likesCount");
    return { liked: false, likesCount: updated?.likesCount ?? 0 };
  }
  await Reaction.create({ user: user._id, targetType: "comment", target: comment._id, type: "like" });
  const updated = await Comment.findByIdAndUpdate(comment._id, { $inc: { likesCount: 1 } }, { returnDocument: "after" }).select("likesCount");
  return { liked: true, likesCount: updated?.likesCount ?? 0 };
}
