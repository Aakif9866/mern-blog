import type { Types } from "mongoose";
import { Notification, type NotificationType } from "../models/Notification";
import { User, PUBLIC_USER_FIELDS, type EmailPrefs } from "../models/User";
import { emitToUser } from "../lib/socket";
import { enqueue } from "../lib/queue";
import { notificationMail } from "../lib/emails";
import { afterCursor, toPage } from "../lib/pagination";

type Id = Types.ObjectId | string;

export interface NotifyInput {
  recipient: Id;
  actor?: Id | null;
  type: NotificationType;
  post?: Id | null;
  comment?: Id | null;
  reaction?: string;
  message?: string;
}

const EMAIL_PREF: Partial<Record<NotificationType, keyof EmailPrefs>> = {
  comment: "comments",
  reply: "comments",
  mention: "mentions",
  follow: "follows",
  reaction: "reactions",
};

function headline(type: NotificationType, actor: string, reaction?: string): string {
  switch (type) {
    case "follow":
      return `${actor} started following you`;
    case "reaction":
      return `${actor} found your post ${reaction === "helpful" ? "helpful" : "worth a like"}`;
    case "comment":
      return `${actor} commented on your post`;
    case "reply":
      return `${actor} replied to your comment`;
    case "mention":
      return `${actor} mentioned you`;
    default:
      return "Update from the Klyro moderation team";
  }
}

const populateSpec = [
  { path: "actor", select: PUBLIC_USER_FIELDS },
  { path: "post", select: "title slug" },
  { path: "comment", select: "content" },
];

/** Stores a notification, pushes it over Socket.io and emails it if the user opted in. */
export async function notify(input: NotifyInput): Promise<void> {
  if (input.actor && String(input.actor) === String(input.recipient)) return;
  // Guests are anonymous and short-lived, so their activity doesn't notify anyone.
  if (input.actor && (await User.exists({ _id: input.actor, isGuest: true }))) return;

  // Collapse repeated reactions/follows from the same actor instead of stacking duplicates.
  if (input.type === "reaction" || input.type === "follow") {
    const exists = await Notification.exists({
      recipient: input.recipient,
      actor: input.actor,
      type: input.type,
      post: input.post ?? null,
      reaction: input.reaction,
    });
    if (exists) return;
  }

  const created = await Notification.create(input);
  const doc = await Notification.findById(created._id).populate(populateSpec).lean();
  emitToUser(String(input.recipient), "notification", doc);

  const prefKey = EMAIL_PREF[input.type];
  const recipient = await User.findById(input.recipient).select("email emailPrefs emailVerified status").lean();
  if (!recipient?.emailVerified || recipient.status === "banned") return;
  if (input.type !== "moderation" && (!prefKey || !recipient.emailPrefs?.[prefKey])) return;

  const actor = doc?.actor as unknown as { username?: string; name?: string } | null;
  const post = doc?.post as unknown as { title?: string; slug?: string } | null;
  const actorName = actor?.name || actor?.username || "Someone";
  const title = headline(input.type, actorName, input.reaction);
  const detail = input.message ?? (post?.title ? `On “${post.title}”` : "Open Klyro to see more.");
  const path = post?.slug ? `/post/${post.slug}` : input.type === "follow" && actor?.username ? `/u/${actor.username}` : "/notifications";
  await enqueue("email", notificationMail(recipient.email, title, detail, path));
}

export async function listNotifications(userId: Id, opts: { cursor?: string; limit: number; unread?: boolean }) {
  const rows = await Notification.find({
    recipient: userId,
    ...(opts.unread ? { read: false } : {}),
    ...afterCursor("createdAt", opts.cursor),
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(opts.limit + 1)
    .populate(populateSpec)
    .lean();
  return toPage(rows, opts.limit, "createdAt");
}

export function unreadCount(userId: Id): Promise<number> {
  return Notification.countDocuments({ recipient: userId, read: false });
}

export async function markRead(userId: Id, ids?: string[]): Promise<void> {
  await Notification.updateMany({ recipient: userId, read: false, ...(ids?.length ? { _id: { $in: ids } } : {}) }, { read: true });
  emitToUser(String(userId), "notifications:read", { ids: ids ?? "all" });
}
