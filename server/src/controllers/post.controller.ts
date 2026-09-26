import type { Request, Response } from "express";
import { createHash } from "node:crypto";
import * as posts from "../services/post.service";
import * as feeds from "../services/feed.service";
import * as ai from "../services/ai.service";
import { body, params, query } from "../middleware/validate";
import { badRequest, unauthorized } from "../lib/errors";
import { saveImage } from "../lib/storage";
import type { PostStatus } from "../models/Post";

type Page = { cursor?: string; limit: number };
const id = (req: Request) => params<{ id: string }>(req).id;

export async function feed(req: Request, res: Response) {
  const q = query<Page & { type: feeds.FeedKind }>(req);
  if (q.type === "following") {
    if (!req.user) throw unauthorized("Sign in to see your following feed");
    return res.json(await feeds.followingFeed(req.user, q));
  }
  res.json(q.type === "trending" ? await feeds.trendingFeed(q) : await feeds.latestFeed(q));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await posts.createPost(req.user!, body(req)));
}

export async function update(req: Request, res: Response) {
  res.json(await posts.updatePost(id(req), req.user!, body(req)));
}

export async function publish(req: Request, res: Response) {
  res.json(await posts.publishPost(id(req), req.user!, body<{ scheduledFor?: Date | null }>(req).scheduledFor));
}

export async function unschedule(req: Request, res: Response) {
  res.json(await posts.unschedulePost(id(req), req.user!));
}

export async function unpublish(req: Request, res: Response) {
  res.json(await posts.unpublishPost(id(req), req.user!));
}

export async function remove(req: Request, res: Response) {
  await posts.deletePost(id(req), req.user!);
  res.json({ ok: true });
}

export async function bySlug(req: Request, res: Response) {
  const post = await posts.getPostBySlug(params<{ slug: string }>(req).slug, req.user);
  const viewer = await posts.viewerState(post._id, post.author._id, req.user);
  res.json({ post, viewer });
}

export async function forEdit(req: Request, res: Response) {
  res.json(await posts.getPostForEdit(id(req), req.user!));
}

export async function mine(req: Request, res: Response) {
  const q = query<Page & { status?: PostStatus }>(req);
  res.json(await posts.myPosts(req.user!, q.status, q));
}

export async function view(req: Request, res: Response) {
  const viewerKey = req.user
    ? String(req.user._id)
    : createHash("sha256").update(`${req.ip}|${req.get("user-agent") ?? ""}`).digest("hex").slice(0, 32);
  res.json({ counted: await posts.recordView(id(req), viewerKey) });
}

export async function related(req: Request, res: Response) {
  res.json({ items: await posts.relatedPosts(id(req)) });
}

export async function revisions(req: Request, res: Response) {
  res.json({ items: await posts.listRevisions(id(req), req.user!) });
}

export async function uploadImage(req: Request, res: Response) {
  if (!req.file) throw badRequest("Choose an image to upload");
  res.status(201).json({ url: await saveImage(req.file.buffer, String(req.user!._id)) });
}

export async function suggestTags(req: Request, res: Response) {
  const { title, content } = body<{ title: string; content: string }>(req);
  res.json({ tags: await ai.suggestTags(title, content) });
}

export async function summarize(req: Request, res: Response) {
  const { title, content } = body<{ title: string; content: string }>(req);
  res.json({ tldr: await ai.summarize(title, content) });
}

// ---- Series ----
export async function createSeries(req: Request, res: Response) {
  res.status(201).json(await posts.createSeries(req.user!, body(req)));
}
export async function mySeries(req: Request, res: Response) {
  res.json({ items: await posts.listSeriesByAuthor(req.user!._id) });
}
export async function getSeries(req: Request, res: Response) {
  res.json(await posts.getSeries(id(req), req.user));
}
export async function updateSeries(req: Request, res: Response) {
  res.json(await posts.updateSeries(id(req), req.user!, body(req)));
}
export async function deleteSeries(req: Request, res: Response) {
  await posts.deleteSeries(id(req), req.user!);
  res.json({ ok: true });
}
