import { z } from "zod";
import { Types } from "mongoose";
import { REPORT_REASONS } from "../models/Report";
import { ROLES } from "../models/User";
import { REACTION_TYPES } from "../models/Reaction";

export const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), "Invalid id");
export const idParam = z.object({ id: objectId });

export const pageQuery = z.object({
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/, "Use 3-30 lowercase letters, numbers or underscores");
const password = z.string().min(8, "Password must be at least 8 characters").max(128);
const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || v.startsWith("/uploads/") || /^https?:\/\//i.test(v), "Must be an http(s) URL");

// ---- Auth ----
export const registerBody = z.object({
  username,
  email,
  password,
  name: z.string().trim().max(60).optional(),
});
export const loginBody = z.object({ identifier: z.string().trim().min(1).max(254), password: z.string().min(1).max(128) });
export const googleBody = z.object({ credential: z.string().min(10).max(5000) });
export const tokenBody = z.object({ token: z.string().min(10).max(200) });
export const emailBody = z.object({ email });
export const resetBody = z.object({ token: z.string().min(10).max(200), password });
export const changePasswordBody = z.object({ currentPassword: z.string().max(128).optional(), newPassword: password });

// ---- Users ----
export const usernameParam = z.object({ username: z.string().trim().toLowerCase().min(1).max(30) });
export const updateMeBody = z
  .object({
    username: username.optional(),
    name: z.string().trim().max(60).optional(),
    bio: z.string().trim().max(280).optional(),
    avatar: httpUrl.optional(),
    website: httpUrl.optional(),
    location: z.string().trim().max(60).optional(),
    emailPrefs: z
      .object({
        comments: z.boolean(),
        mentions: z.boolean(),
        follows: z.boolean(),
        reactions: z.boolean(),
        digest: z.boolean(),
      })
      .partial()
      .optional(),
  })
  .strict();
export const deleteMeBody = z.object({ password: z.string().max(128).optional() });
export const onboardingBody = z.object({
  tags: z.array(z.string().max(30)).max(20).default([]),
  follows: z.array(z.string().max(30)).max(20).default([]),
});

// ---- Posts ----
const tags = z.array(z.string().trim().min(1).max(30)).max(5, "Use at most 5 tags");
export const postBody = z
  .object({
    title: z.string().max(200).optional(),
    content: z.string().max(200_000).optional(),
    coverImage: httpUrl.optional(),
    tags: tags.optional(),
    series: objectId.nullable().optional(),
    seriesOrder: z.number().int().min(0).max(1000).optional(),
  })
  .strict();
export const publishBody = z.object({ scheduledFor: z.coerce.date().nullable().optional() });
export const slugParam = z.object({ slug: z.string().min(1).max(200) });
export const myPostsQuery = pageQuery.extend({ status: z.enum(["draft", "scheduled", "published"]).optional() });
export const reactionBody = z.object({ type: z.enum(REACTION_TYPES) });
export const aiTextBody = z.object({ title: z.string().max(200).default(""), content: z.string().max(200_000) });
export const seriesBody = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(500).optional() });
export const seriesUpdateBody = seriesBody.partial();

// ---- Feeds & search ----
export const feedQuery = pageQuery.extend({ type: z.enum(["latest", "trending", "following"]).default("latest") });
export const tagFeedQuery = pageQuery.extend({ sort: z.enum(["latest", "top"]).default("latest") });
export const searchQuery = z.object({
  q: z.string().trim().min(1).max(100),
  type: z.enum(["all", "posts", "users", "tags"]).default("all"),
  tag: z.string().max(30).optional(),
  sort: z.enum(["relevance", "latest", "top"]).default("relevance"),
  page: z.coerce.number().int().min(1).max(50).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});
export const tagParam = z.object({ tag: z.string().trim().min(1).max(30) });

// ---- Comments ----
export const commentBody = z.object({
  postId: objectId,
  parentId: objectId.nullable().optional(),
  content: z.string().trim().min(1, "Comment can't be empty").max(2000),
});
export const commentEditBody = z.object({ content: z.string().trim().min(1).max(2000) });
export const postIdParam = z.object({ postId: objectId });

// ---- Bookmarks ----
export const bookmarkBody = z.object({ list: objectId.nullable().optional() });
export const bookmarksQuery = pageQuery.extend({ list: z.union([objectId, z.literal("none")]).optional() });
export const collectionBody = z.object({ name: z.string().trim().min(1).max(60), description: z.string().trim().max(200).optional() });

// ---- Notifications ----
export const notificationsQuery = pageQuery.extend({ unread: z.enum(["true", "false"]).optional().transform((v) => v === "true") });
export const markReadBody = z.object({ ids: z.array(objectId).max(100).optional() });

// ---- Moderation ----
export const reportBody = z.object({
  targetType: z.enum(["post", "comment"]),
  targetId: objectId,
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).optional(),
});
export const reportsQuery = pageQuery.extend({ status: z.enum(["open", "resolved", "dismissed"]).default("open") });
export const resolveBody = z.object({
  action: z.enum(["dismiss", "remove", "remove_and_suspend", "remove_and_ban"]),
  note: z.string().trim().max(500).optional(),
  suspendDays: z.number().int().min(1).max(365).optional(),
});
export const usersQuery = pageQuery.extend({
  q: z.string().trim().max(100).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(["active", "suspended", "banned"]).optional(),
});
export const statusBody = z.object({
  status: z.enum(["active", "suspended", "banned"]),
  note: z.string().trim().max(500).optional(),
  days: z.number().int().min(1).max(365).optional(),
});
export const roleBody = z.object({ role: z.enum(ROLES) });
