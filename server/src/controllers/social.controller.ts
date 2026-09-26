import type { Request, Response } from "express";
import * as comments from "../services/comment.service";
import * as engagement from "../services/engagement.service";
import * as notifications from "../services/notification.service";
import * as tags from "../services/tag.service";
import * as search from "../services/search.service";
import { tagFeed } from "../services/feed.service";
import { searchUsers } from "../services/user.service";
import { body, params, query } from "../middleware/validate";
import type { ReactionType } from "../models/Reaction";

type Page = { cursor?: string; limit: number };
const id = (req: Request) => params<{ id: string }>(req).id;

// ---- Comments ----
export async function listComments(req: Request, res: Response) {
  res.json(await comments.listComments(params<{ postId: string }>(req).postId, query<Page>(req), req.user));
}
export async function createComment(req: Request, res: Response) {
  const b = body<{ postId: string; parentId?: string | null; content: string }>(req);
  res.status(201).json(await comments.createComment(req.user!, b.postId, b.content, b.parentId));
}
export async function editComment(req: Request, res: Response) {
  res.json(await comments.editComment(req.user!, id(req), body<{ content: string }>(req).content));
}
export async function deleteComment(req: Request, res: Response) {
  await comments.deleteComment(req.user!, id(req));
  res.json({ ok: true });
}
export async function likeComment(req: Request, res: Response) {
  res.json(await comments.toggleCommentLike(req.user!, id(req)));
}

// ---- Reactions & bookmarks ----
export async function react(req: Request, res: Response) {
  res.json(await engagement.togglePostReaction(req.user!, id(req), body<{ type: ReactionType }>(req).type));
}
export async function bookmark(req: Request, res: Response) {
  res.json(await engagement.addBookmark(req.user!, id(req), body<{ list?: string | null }>(req).list));
}
export async function unbookmark(req: Request, res: Response) {
  res.json(await engagement.removeBookmark(req.user!, id(req)));
}
export async function listBookmarks(req: Request, res: Response) {
  res.json(await engagement.listBookmarks(req.user!, query(req)));
}
export async function listCollections(req: Request, res: Response) {
  res.json(await engagement.listCollections(req.user!));
}
export async function createCollection(req: Request, res: Response) {
  res.status(201).json(await engagement.createCollection(req.user!, body(req)));
}
export async function updateCollection(req: Request, res: Response) {
  res.json(await engagement.updateCollection(req.user!, id(req), body(req)));
}
export async function deleteCollection(req: Request, res: Response) {
  await engagement.deleteCollection(req.user!, id(req));
  res.json({ ok: true });
}

// ---- Notifications ----
export async function listNotifications(req: Request, res: Response) {
  res.json(await notifications.listNotifications(req.user!._id, query(req)));
}
export async function unreadCount(req: Request, res: Response) {
  res.json({ count: await notifications.unreadCount(req.user!._id) });
}
export async function markRead(req: Request, res: Response) {
  await notifications.markRead(req.user!._id, body<{ ids?: string[] }>(req).ids);
  res.json({ ok: true });
}

// ---- Tags & search ----
export async function trendingTags(_req: Request, res: Response) {
  res.json({ items: await tags.trendingTags(12) });
}
export async function popularTags(_req: Request, res: Response) {
  res.json({ items: await tags.popularTags(40) });
}
export async function tagDetail(req: Request, res: Response) {
  res.json(await tags.getTag(params<{ tag: string }>(req).tag, req.user));
}
export async function tagPosts(req: Request, res: Response) {
  const q = query<Page & { sort: "latest" | "top" }>(req);
  res.json(await tagFeed(params<{ tag: string }>(req).tag, q.sort, q));
}
export async function searchHandler(req: Request, res: Response) {
  const q = query<{ q: string; type: string; tag?: string; sort: "relevance" | "latest" | "top"; page: number; limit: number }>(req);
  if (q.type === "posts") return res.json(await search.searchPosts(q));
  if (q.type === "users") return res.json({ items: await searchUsers(q.q, q.limit) });
  if (q.type === "tags") return res.json({ items: await tags.searchTags(q.q, q.limit) });
  res.json(await search.searchAll(q.q));
}
