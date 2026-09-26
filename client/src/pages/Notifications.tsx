import { useState } from "react";
import { Link } from "react-router";
import { AtSign, Bell, CheckCheck, Heart, Lightbulb, MessageCircle, Reply, ShieldAlert, UserPlus } from "lucide-react";
import clsx from "clsx";
import { flatten, useCursorList, useMarkRead } from "@/api/hooks";
import { keys } from "@/api/keys";
import type { NotificationItem } from "@/lib/types";
import { notificationText } from "@/lib/session";
import { timeAgo } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState, LoadMore } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/Skeleton";

const ICONS = {
  follow: { icon: UserPlus, cls: "bg-sky-500" },
  comment: { icon: MessageCircle, cls: "bg-emerald-500" },
  reply: { icon: Reply, cls: "bg-emerald-500" },
  mention: { icon: AtSign, cls: "bg-brand-500" },
  moderation: { icon: ShieldAlert, cls: "bg-amber-500" },
};

function link(n: NotificationItem) {
  if (n.post) return `/post/${n.post.slug}${n.comment ? "#comments" : ""}`;
  if (n.type === "follow" && n.actor) return `/u/${n.actor.username}`;
  return "/notifications";
}

export default function Notifications() {
  const [unread, setUnread] = useState(false);
  const q = useCursorList<NotificationItem>(keys.notifications(unread), "/notifications", { unread: unread ? "true" : undefined, limit: 20 });
  const mark = useMarkRead();
  const items = flatten(q.data);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <title>Notifications · Klyro</title>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Notifications</h1>
        <Button variant="outline" size="sm" onClick={() => mark.mutate(undefined)} disabled={!items.some((n) => !n.read)}>
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </div>
      <Tabs className="mt-4" value={unread ? "unread" : "all"} onChange={(v) => setUnread(v === "unread")} tabs={[{ value: "all", label: "All" }, { value: "unread", label: "Unread" }]} />
      <div className="mt-4">
        {q.isLoading ? (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Bell className="h-5 w-5" />} title={unread ? "You're all caught up" : "No notifications yet"}>
            Follows, reactions, comments and mentions will show up here.
          </EmptyState>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-line bg-surface">
            {items.map((n) => {
              const reaction = n.type === "reaction" ? (n.reaction === "helpful" ? { icon: Lightbulb, cls: "bg-amber-500" } : { icon: Heart, cls: "bg-rose-500" }) : null;
              const meta = reaction ?? ICONS[n.type as keyof typeof ICONS];
              return (
                <li key={n._id} className="border-b border-line last:border-0">
                  <Link to={link(n)} onClick={() => !n.read && mark.mutate([n._id])} className={clsx("flex gap-3 px-4 py-3.5 hover:bg-muted", !n.read && "bg-brand-50/60 dark:bg-brand-950/20")}>
                    <span className="relative shrink-0">
                      <Avatar user={n.actor} size="md" />
                      <span className={clsx("absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white ring-2 ring-surface", meta.cls)}>
                        <meta.icon className="h-3 w-3" />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">
                        <strong className="font-semibold">{notificationText(n)}</strong>
                      </span>
                      {n.post && <span className="block truncate text-sm text-ink-soft">{n.post.title}</span>}
                      {n.comment && n.type !== "reaction" && <span className="mt-1 line-clamp-2 block rounded-lg bg-muted px-2.5 py-1.5 text-sm text-ink-soft">{n.comment.content}</span>}
                      <span className="mt-1 block text-xs text-ink-soft">{timeAgo(n.createdAt)}</span>
                    </span>
                    {!n.read && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <LoadMore onVisible={() => void q.fetchNextPage()} loading={q.isFetchingNextPage} hasMore={Boolean(q.hasNextPage)} />
      </div>
    </div>
  );
}
