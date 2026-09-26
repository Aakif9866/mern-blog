import { Types } from "mongoose";
import { Report, type IReport } from "../models/Report";
import { Post } from "../models/Post";
import { Comment } from "../models/Comment";
import { User, PUBLIC_USER_FIELDS, type Role, type UserDoc } from "../models/User";
import { Session } from "../models/Session";
import { Reaction } from "../models/Reaction";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors";
import { afterCursor, toPage } from "../lib/pagination";
import { escapeRegex } from "../lib/text";
import { hasRole } from "../middleware/auth";
import { softDelete } from "./post.service";
import { removeComment } from "./comment.service";
import { notify } from "./notification.service";
import { invalidateProfile } from "./user.service";

export async function createReport(
  reporter: UserDoc,
  input: { targetType: "post" | "comment"; targetId: string; reason: IReport["reason"]; details?: string }
) {
  if (!Types.ObjectId.isValid(input.targetId)) throw notFound("Content");
  const target =
    input.targetType === "post"
      ? await Post.findOne({ _id: input.targetId, deletedAt: null }).select("author")
      : await Comment.findOne({ _id: input.targetId, deletedAt: null }).select("author");
  if (!target) throw notFound("Content");
  if (String(target.author) === String(reporter._id)) throw badRequest("You can't report your own content");
  if (await Report.exists({ reporter: reporter._id, target: target._id, status: "open" })) throw conflict("You already reported this");
  return Report.create({
    reporter: reporter._id,
    targetType: input.targetType,
    target: target._id,
    targetAuthor: target.author,
    reason: input.reason,
    details: input.details ?? "",
  });
}

/** Moderation queue with the reported content attached. */
export async function listReports(opts: { status: IReport["status"]; cursor?: string; limit: number }) {
  const rows = await Report.find({ status: opts.status, ...afterCursor("createdAt", opts.cursor) })
    .sort({ createdAt: -1, _id: -1 })
    .limit(opts.limit + 1)
    .populate("reporter", PUBLIC_USER_FIELDS)
    .populate("targetAuthor", `${PUBLIC_USER_FIELDS} status suspendedUntil`)
    .populate("resolvedBy", PUBLIC_USER_FIELDS)
    .lean();
  const page = toPage(rows, opts.limit, "createdAt");
  const postIds = page.items.filter((r) => r.targetType === "post").map((r) => r.target);
  const commentIds = page.items.filter((r) => r.targetType === "comment").map((r) => r.target);
  const [posts, comments] = await Promise.all([
    Post.find({ _id: { $in: postIds } }).select("title slug excerpt deletedAt").lean(),
    Comment.find({ _id: { $in: commentIds } }).select("content post deletedAt").populate("post", "title slug").lean(),
  ]);
  const byId = new Map<string, unknown>([...posts, ...comments].map((d) => [String(d._id), d]));
  return { items: page.items.map((r) => ({ ...r, content: byId.get(String(r.target)) ?? null })), nextCursor: page.nextCursor };
}

export type ModAction = "dismiss" | "remove" | "remove_and_suspend" | "remove_and_ban";

export async function resolveReport(moderator: UserDoc, reportId: string, action: ModAction, note = "", suspendDays = 7) {
  const report = await Report.findById(reportId);
  if (!report) throw notFound("Report");
  if (report.status !== "open") throw conflict("This report was already handled");

  if (action !== "dismiss") {
    if (report.targetType === "post") {
      const post = await Post.findOne({ _id: report.target, deletedAt: null });
      if (post) await softDelete(post);
    } else {
      await removeComment(report.target);
    }
    await notify({
      recipient: report.targetAuthor,
      type: "moderation",
      message: `Your ${report.targetType} was removed for violating community guidelines (${report.reason}).`,
    });
    if (action === "remove_and_suspend") await setUserStatus(moderator, String(report.targetAuthor), "suspended", note, suspendDays);
    if (action === "remove_and_ban") await setUserStatus(moderator, String(report.targetAuthor), "banned", note);
  }

  // Every open report on the same content is settled together.
  await Report.updateMany(
    { target: report.target, status: "open" },
    { status: action === "dismiss" ? "dismissed" : "resolved", resolvedBy: moderator._id, resolvedAt: new Date(), resolution: note || action }
  );
  return Report.findById(report._id).lean();
}

function assertCanModerate(actor: UserDoc, target: { role: Role; _id: unknown }) {
  if (String(actor._id) === String(target._id)) throw badRequest("You can't moderate your own account");
  // Moderators act on regular users only; admins act on anyone but other admins.
  if (hasRole(target.role, "admin") || (!hasRole(actor.role, "admin") && hasRole(target.role, "moderator"))) {
    throw forbidden("You can't moderate this account");
  }
}

export async function setUserStatus(actor: UserDoc, userId: string, status: "active" | "suspended" | "banned", note = "", days = 7) {
  const target = await User.findById(userId);
  if (!target) throw notFound("User");
  assertCanModerate(actor, target);
  if (status === "banned" && !hasRole(actor.role, "admin")) throw forbidden("Only admins can ban accounts");

  target.status = status;
  target.suspendedUntil = status === "suspended" ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
  target.moderationNote = note;
  if (status === "banned") target.tokenVersion += 1;
  await target.save();
  if (status === "banned") await Session.updateMany({ user: target._id, revokedAt: null }, { revokedAt: new Date() });
  if (status === "suspended") {
    await notify({ recipient: target._id, type: "moderation", message: `Your account is suspended for ${days} day(s). ${note}`.trim() });
  }
  await invalidateProfile(target.username);
  return target;
}

export async function setUserRole(actor: UserDoc, userId: string, role: Role) {
  if (!hasRole(actor.role, "admin")) throw forbidden("Only admins can change roles");
  if (String(actor._id) === userId) throw badRequest("You can't change your own role");
  const target = await User.findByIdAndUpdate(userId, { role, $inc: { tokenVersion: 1 } }, { returnDocument: "after" });
  if (!target) throw notFound("User");
  return target;
}

export async function listUsers(opts: { q?: string; role?: string; status?: string; cursor?: string; limit: number }) {
  const filter: Record<string, unknown> = {};
  if (opts.q) {
    const rx = new RegExp(escapeRegex(opts.q), "i");
    filter.$or = [{ username: rx }, { email: rx }, { name: rx }];
  }
  if (opts.role) filter.role = opts.role;
  if (opts.status) filter.status = opts.status;
  const rows = await User.find({ ...filter, ...(opts.cursor ? { $and: [afterCursor("createdAt", opts.cursor)] } : {}) })
    .select("username name email avatar role status suspendedUntil emailVerified postsCount followersCount createdAt")
    .sort({ createdAt: -1, _id: -1 })
    .limit(opts.limit + 1)
    .lean();
  return toPage(rows, opts.limit, "createdAt");
}

// ---- Analytics ----

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function dailySeries(model: typeof User | typeof Post | typeof Comment, field: string, days: number, match: object = {}) {
  const rows = await (model as typeof User).aggregate<{ _id: string; n: number }>([
    { $match: { ...match, [field]: { $gte: daysAgo(days) } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: `$${field}` } }, n: { $sum: 1 } } },
  ]);
  const map = new Map(rows.map((r) => [r._id, r.n]));
  return Array.from({ length: days }, (_, i) => {
    const d = daysAgo(days - 1 - i).toISOString().slice(0, 10);
    return { date: d, count: map.get(d) ?? 0 };
  });
}

export async function analytics() {
  const published = { status: "published" as const, deletedAt: null };
  const [users, posts, comments, reactions, users7, posts7, comments7, openReports, views, topPosts, topTags, userSeries, postSeries, commentSeries] =
    await Promise.all([
      User.countDocuments(),
      Post.countDocuments(published),
      Comment.countDocuments({ deletedAt: null }),
      Reaction.countDocuments(),
      User.countDocuments({ createdAt: { $gte: daysAgo(7) } }),
      Post.countDocuments({ ...published, publishedAt: { $gte: daysAgo(7) } }),
      Comment.countDocuments({ deletedAt: null, createdAt: { $gte: daysAgo(7) } }),
      Report.countDocuments({ status: "open" }),
      Post.aggregate<{ total: number }>([{ $match: published }, { $group: { _id: null, total: { $sum: "$views" } } }]),
      Post.find(published).sort({ views: -1 }).limit(5).select("title slug views likesCount helpfulCount commentsCount").lean(),
      Post.aggregate<{ _id: string; posts: number; views: number }>([
        { $match: published },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", posts: { $sum: 1 }, views: { $sum: "$views" } } },
        { $sort: { posts: -1 } },
        { $limit: 8 },
      ]),
      dailySeries(User, "createdAt", 30),
      dailySeries(Post, "publishedAt", 30, published),
      dailySeries(Comment, "createdAt", 30, { deletedAt: null }),
    ]);
  return {
    totals: { users, posts, comments, reactions, views: views[0]?.total ?? 0, openReports },
    last7Days: { users: users7, posts: posts7, comments: comments7 },
    topPosts,
    topTags: topTags.map((t) => ({ tag: t._id, posts: t.posts, views: t.views })),
    series: userSeries.map((u, i) => ({ date: u.date, users: u.count, posts: postSeries[i]?.count ?? 0, comments: commentSeries[i]?.count ?? 0 })),
  };
}
