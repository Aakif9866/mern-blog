import { Router } from "express";
import mongoose from "mongoose";
import { aiLimiter, authLimiter, writeLimiter } from "../middleware/security";
import { imageUpload } from "../middleware/upload";
import { requireActiveUser, requireMember } from "../middleware/auth";
import { documentedRouter } from "../docs/registry";
import * as v from "../validators";
import * as auth from "../controllers/auth.controller";
import * as users from "../controllers/user.controller";
import * as posts from "../controllers/post.controller";
import * as social from "../controllers/social.controller";
import * as mod from "../controllers/moderation.controller";
import { redisReady } from "../lib/redis";

export const api = Router();

api.get("/health", (_req, res) => {
  res.json({ ok: true, db: mongoose.connection.readyState === 1, redis: redisReady() });
});

// ---- Auth ----
const a = documentedRouter("/auth", "Auth");
a.get("/config", { summary: "Public client configuration (Google client id, AI availability)" }, auth.config);
a.post("/register", { summary: "Create an account and sign in", body: v.registerBody, before: [authLimiter] }, auth.register);
a.post("/login", { summary: "Sign in with email or username", body: v.loginBody, before: [authLimiter] }, auth.login);
a.post("/google", { summary: "Sign in with a Google ID token", body: v.googleBody, before: [authLimiter] }, auth.google);
a.post("/guest", { summary: "Start a temporary guest session (deleted after 24 hours unless upgraded)", before: [authLimiter] }, auth.guest);
a.post("/guest/upgrade", { summary: "Turn the current guest account into a full account, keeping its activity", access: "user", body: v.registerBody, before: [authLimiter] }, auth.upgradeGuest);
a.post("/refresh", { summary: "Rotate the refresh token and issue a new access token" }, auth.refresh);
a.post("/logout", { summary: "Sign out of this device" }, auth.logout);
a.post("/logout-all", { summary: "Sign out of every device", access: "user" }, auth.logoutAll);
a.get("/session", { summary: "Current session: the user, or null for guests (restores from the refresh cookie)" }, auth.session);
a.get("/me", { summary: "The signed-in user's account", access: "user" }, auth.me);
a.get("/sessions", { summary: "Active sessions for this account", access: "user" }, auth.sessions);
a.delete("/sessions/:id", { summary: "Revoke one session", access: "user", params: v.idParam }, auth.revokeSession);
a.post("/verify-email", { summary: "Confirm an email address with the emailed token", body: v.tokenBody }, auth.verifyEmail);
a.post("/resend-verification", { summary: "Send the verification email again", access: "user", before: [authLimiter] }, auth.resendVerification);
a.post("/forgot-password", { summary: "Email a password reset link", body: v.emailBody, before: [authLimiter] }, auth.forgotPassword);
a.post("/reset-password", { summary: "Set a new password with the emailed token", body: v.resetBody, before: [authLimiter] }, auth.resetPassword);
a.post("/change-password", { summary: "Change password", access: "user", body: v.changePasswordBody, before: [authLimiter, requireMember] }, auth.changePassword);
api.use("/auth", a.router);

// ---- Users ----
const u = documentedRouter("/users", "Users");
u.get("/suggestions", { summary: "Writers to follow" }, users.suggestions);
u.patch("/me", { summary: "Update profile and email preferences", access: "user", body: v.updateMeBody }, users.updateMe);
u.post("/me/avatar", { summary: "Upload a profile picture", access: "user", upload: true, before: [requireMember, writeLimiter, imageUpload] }, users.uploadAvatar);
u.delete("/me", { summary: "Delete my account", access: "user", body: v.deleteMeBody }, users.deleteMe);
u.post("/me/onboarding", { summary: "Save interests and follows from onboarding", access: "user", body: v.onboardingBody }, users.onboarding);
u.get("/:username", { summary: "Public profile", params: v.usernameParam }, users.profile);
u.get("/:username/posts", { summary: "Posts by a user", params: v.usernameParam, query: v.pageQuery }, users.profilePosts);
u.get("/:username/series", { summary: "Series by a user", params: v.usernameParam }, users.profileSeries);
u.get("/:username/followers", { summary: "Followers", params: v.usernameParam, query: v.pageQuery }, users.followers);
u.get("/:username/following", { summary: "Following", params: v.usernameParam, query: v.pageQuery }, users.following);
u.post("/:username/follow", { summary: "Follow a user", access: "user", params: v.usernameParam, before: [writeLimiter] }, users.follow);
u.delete("/:username/follow", { summary: "Unfollow a user", access: "user", params: v.usernameParam }, users.unfollow);
api.use("/users", u.router);

// ---- Posts ----
const p = documentedRouter("/posts", "Posts");
p.get("/", { summary: "Feed: latest, trending or following", query: v.feedQuery }, posts.feed);
p.get("/mine", { summary: "My drafts, scheduled and published posts", access: "user", query: v.myPostsQuery }, posts.mine);
p.post("/", { summary: "Create a draft", access: "writer", body: v.postBody }, posts.create);
p.post("/images", { summary: "Upload an image for a post", access: "member", upload: true, before: [imageUpload] }, posts.uploadImage);
p.post("/ai/suggest-tags", { summary: "AI tag suggestions for a draft", access: "member", body: v.aiTextBody, before: [aiLimiter] }, posts.suggestTags);
p.post("/ai/summarize", { summary: "AI TL;DR preview for a draft", access: "member", body: v.aiTextBody, before: [aiLimiter] }, posts.summarize);
p.get("/slug/:slug", { summary: "Read a post by slug, with the viewer's reactions/bookmark state", params: v.slugParam }, posts.bySlug);
p.get("/:id/edit", { summary: "Load a post for editing", access: "user", params: v.idParam }, posts.forEdit);
// Autosave calls this every few seconds, so it checks for an active account but skips the write limiter.
p.patch("/:id", { summary: "Update a post (autosave for drafts; edits to published posts are versioned)", access: "user", params: v.idParam, body: v.postBody, before: [requireActiveUser] }, posts.update);
p.post("/:id/publish", { summary: "Publish now or schedule", access: "member", params: v.idParam, body: v.publishBody }, posts.publish);
p.post("/:id/unschedule", { summary: "Cancel a scheduled publish", access: "user", params: v.idParam }, posts.unschedule);
p.post("/:id/unpublish", { summary: "Move a published post back to drafts", access: "user", params: v.idParam }, posts.unpublish);
p.delete("/:id", { summary: "Delete a post (soft delete)", access: "user", params: v.idParam }, posts.remove);
p.post("/:id/view", { summary: "Count a view", params: v.idParam }, posts.view);
p.get("/:id/related", { summary: "Related posts", params: v.idParam }, posts.related);
p.get("/:id/revisions", { summary: "Edit history", access: "user", params: v.idParam }, posts.revisions);
p.post("/:id/reactions", { summary: "Toggle Like or Helpful", access: "user", params: v.idParam, body: v.reactionBody, before: [writeLimiter] }, social.react);
p.put("/:id/bookmark", { summary: "Bookmark (optionally into a collection)", access: "user", params: v.idParam, body: v.bookmarkBody }, social.bookmark);
p.delete("/:id/bookmark", { summary: "Remove bookmark", access: "user", params: v.idParam }, social.unbookmark);
api.use("/posts", p.router);

// ---- Series ----
const s = documentedRouter("/series", "Series");
s.post("/", { summary: "Create a series", access: "writer", body: v.seriesBody }, posts.createSeries);
s.get("/mine", { summary: "My series", access: "user" }, posts.mySeries);
s.get("/:id", { summary: "A series with its posts", params: v.idParam }, posts.getSeries);
s.patch("/:id", { summary: "Rename a series", access: "user", params: v.idParam, body: v.seriesUpdateBody }, posts.updateSeries);
s.delete("/:id", { summary: "Delete a series (posts are kept)", access: "user", params: v.idParam }, posts.deleteSeries);
api.use("/series", s.router);

// ---- Comments ----
const c = documentedRouter("/comments", "Comments");
c.get("/post/:postId", { summary: "Comment threads for a post", params: v.postIdParam, query: v.pageQuery }, social.listComments);
c.post("/", { summary: "Comment or reply (supports @mentions)", access: "member", body: v.commentBody }, social.createComment);
c.patch("/:id", { summary: "Edit my comment", access: "member", params: v.idParam, body: v.commentEditBody }, social.editComment);
c.delete("/:id", { summary: "Delete a comment", access: "user", params: v.idParam }, social.deleteComment);
c.post("/:id/like", { summary: "Toggle like on a comment", access: "user", params: v.idParam, before: [writeLimiter] }, social.likeComment);
api.use("/comments", c.router);

// ---- Bookmarks ----
const b = documentedRouter("/bookmarks", "Bookmarks");
b.get("/", { summary: "Saved posts", access: "user", query: v.bookmarksQuery }, social.listBookmarks);
b.get("/collections", { summary: "My collections with counts", access: "user" }, social.listCollections);
b.post("/collections", { summary: "Create a collection", access: "user", body: v.collectionBody }, social.createCollection);
b.patch("/collections/:id", { summary: "Rename a collection", access: "user", params: v.idParam, body: v.collectionBody.partial() }, social.updateCollection);
b.delete("/collections/:id", { summary: "Delete a collection", access: "user", params: v.idParam }, social.deleteCollection);
api.use("/bookmarks", b.router);

// ---- Notifications ----
const n = documentedRouter("/notifications", "Notifications");
n.get("/", { summary: "Notification center", access: "user", query: v.notificationsQuery }, social.listNotifications);
n.get("/unread-count", { summary: "Unread count", access: "user" }, social.unreadCount);
n.post("/read", { summary: "Mark some or all as read", access: "user", body: v.markReadBody }, social.markRead);
api.use("/notifications", n.router);

// ---- Tags ----
const t = documentedRouter("/tags", "Tags");
t.get("/trending", { summary: "Trending tags" }, social.trendingTags);
t.get("/popular", { summary: "Most used tags" }, social.popularTags);
t.get("/:tag", { summary: "Tag details", params: v.tagParam }, social.tagDetail);
t.get("/:tag/posts", { summary: "Posts in a tag", params: v.tagParam, query: v.tagFeedQuery }, social.tagPosts);
t.post("/:tag/follow", { summary: "Follow a tag", access: "user", params: v.tagParam }, users.followTag);
t.delete("/:tag/follow", { summary: "Unfollow a tag", access: "user", params: v.tagParam }, users.unfollowTag);
api.use("/tags", t.router);

// ---- Search ----
const q = documentedRouter("/search", "Search");
q.get("/", { summary: "Search posts, users and tags", query: v.searchQuery }, social.searchHandler);
api.use("/search", q.router);

// ---- Reports & moderation ----
const r = documentedRouter("/reports", "Moderation");
r.post("/", { summary: "Report a post or comment", access: "member", body: v.reportBody }, mod.report);
api.use("/reports", r.router);

const m = documentedRouter("/mod", "Moderation");
m.get("/reports", { summary: "Moderation queue", access: "moderator", query: v.reportsQuery }, mod.reports);
m.post("/reports/:id/resolve", { summary: "Dismiss or act on a report", access: "moderator", params: v.idParam, body: v.resolveBody }, mod.resolve);
m.get("/users", { summary: "Find users", access: "moderator", query: v.usersQuery }, mod.users);
m.patch("/users/:id/status", { summary: "Suspend, ban or restore a user", access: "moderator", params: v.idParam, body: v.statusBody }, mod.setStatus);
m.patch("/users/:id/role", { summary: "Change a user's role", access: "admin", params: v.idParam, body: v.roleBody }, mod.setRole);
m.get("/analytics", { summary: "User, post and engagement analytics", access: "moderator" }, mod.analytics);
api.use("/mod", m.router);
