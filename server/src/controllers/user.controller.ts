import type { Request, Response } from "express";
import * as users from "../services/user.service";
import * as auth from "../services/auth.service";
import * as tags from "../services/tag.service";
import { listSeriesByAuthor } from "../services/post.service";
import { authorFeed } from "../services/feed.service";
import { body, params, query } from "../middleware/validate";
import { badRequest } from "../lib/errors";
import { clearAuthCookies } from "../lib/cookies";
import { saveImage } from "../lib/storage";

type U = { username: string };
type Page = { cursor?: string; limit: number };

export async function profile(req: Request, res: Response) {
  res.json(await users.getProfile(params<U>(req).username, req.user?._id));
}

export async function profilePosts(req: Request, res: Response) {
  res.json(await authorFeed(params<U>(req).username, query<Page>(req)));
}

export async function profileSeries(req: Request, res: Response) {
  const p = await users.getProfile(params<U>(req).username);
  res.json({ items: await listSeriesByAuthor(p._id) });
}

export async function followers(req: Request, res: Response) {
  res.json(await users.listConnections(params<U>(req).username, "followers", query<Page>(req), req.user?._id));
}

export async function following(req: Request, res: Response) {
  res.json(await users.listConnections(params<U>(req).username, "following", query<Page>(req), req.user?._id));
}

export async function follow(req: Request, res: Response) {
  res.json(await users.follow(req.user!, params<U>(req).username));
}

export async function unfollow(req: Request, res: Response) {
  res.json(await users.unfollow(req.user!, params<U>(req).username));
}

export async function updateMe(req: Request, res: Response) {
  const user = await users.updateProfile(req.user!, body(req));
  res.json({ user: auth.serializeMe(user) });
}

export async function uploadAvatar(req: Request, res: Response) {
  if (!req.file) throw badRequest("Choose an image to upload");
  const url = await saveImage(req.file.buffer, String(req.user!._id));
  const user = await users.updateProfile(req.user!, { avatar: url });
  res.json({ user: auth.serializeMe(user) });
}

export async function deleteMe(req: Request, res: Response) {
  const { password } = body<{ password?: string }>(req);
  if (!(await auth.checkPassword(req.user!._id, password))) throw badRequest("Password is incorrect");
  await users.deleteAccount(req.user!._id);
  clearAuthCookies(res);
  res.json({ ok: true });
}

export async function suggestions(req: Request, res: Response) {
  res.json({ items: await users.suggestions(req.user) });
}

export async function onboarding(req: Request, res: Response) {
  const { tags: t, follows } = body<{ tags: string[]; follows: string[] }>(req);
  await users.completeOnboarding(req.user!, t, follows);
  req.user!.onboarded = true;
  res.json({ user: auth.serializeMe(req.user!) });
}

export async function followTag(req: Request, res: Response) {
  res.json(await tags.followTag(req.user!, params<{ tag: string }>(req).tag));
}

export async function unfollowTag(req: Request, res: Response) {
  res.json(await tags.unfollowTag(req.user!, params<{ tag: string }>(req).tag));
}
