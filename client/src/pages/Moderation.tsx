import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, CheckCircle2, Eye, FileText, Flag, Heart, MessageCircle, Search as SearchIcon, ShieldCheck, Trash2, Users as UsersIcon } from "lucide-react";
import { flatten, useCursorList } from "@/api/hooks";
import { keys } from "@/api/keys";
import { api, errorMessage } from "@/lib/api";
import type { AdminUser, Analytics, Report, Role } from "@/lib/types";
import { useMe } from "@/store";
import { useDebounced } from "@/lib/useDebounce";
import { compact, displayName, formatDate, timeAgo } from "@/lib/format";
import { Tabs } from "@/components/ui/Tabs";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, Card, EmptyState, LoadMore } from "@/components/ui/misc";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { DailyBars } from "@/components/DailyBars";

type Tab = "reports" | "users" | "analytics";

function ReportCard({ report }: { report: Report }) {
  const qc = useQueryClient();
  const [action, setAction] = useState<"remove" | "remove_and_suspend" | "remove_and_ban" | null>(null);
  const [note, setNote] = useState("");
  const [days, setDays] = useState(7);
  const me = useMe()!;
  const resolve = useMutation({
    mutationFn: (a: string) => api.post(`/mod/reports/${report._id}/resolve`, { action: a, note: note || undefined, suspendDays: days }),
    onSuccess: () => {
      toast.success("Report handled");
      setAction(null);
      void qc.invalidateQueries({ queryKey: ["mod"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const c = report.content;
  const link = c && "slug" in c ? `/post/${c.slug}` : c && "post" in c && c.post ? `/post/${c.post.slug}#comments` : null;

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone="red">{report.reason}</Badge>
        <Badge>{report.targetType}</Badge>
        <span className="text-ink-soft">
          reported by {displayName(report.reporter)} · {timeAgo(report.createdAt)}
        </span>
      </div>
      <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
        {!c ? (
          <span className="italic text-ink-soft">Content no longer exists</span>
        ) : "title" in c ? (
          <>
            <div className="font-semibold [overflow-wrap:anywhere]">{c.title}</div>
            <p className="mt-1 line-clamp-3 text-ink-soft">{c.excerpt}</p>
          </>
        ) : (
          <p className="line-clamp-4 whitespace-pre-wrap [overflow-wrap:anywhere]">{c.content}</p>
        )}
        {c?.deletedAt && <Badge tone="amber">already removed</Badge>}
      </div>
      {report.details && <p className="mt-2 text-sm [overflow-wrap:anywhere]"><span className="text-ink-soft">Reporter's note:</span> {report.details}</p>}
      <div className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
        Author:
        <Link to={`/u/${report.targetAuthor.username}`} className="font-medium text-ink hover:underline">@{report.targetAuthor.username}</Link>
        {report.targetAuthor.status !== "active" && <Badge tone="amber">{report.targetAuthor.status}</Badge>}
      </div>
      {report.status === "open" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {link && (
            <Link to={link} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm text-ink-soft hover:bg-muted">
              <Eye className="h-4 w-4" /> View
            </Link>
          )}
          <Button size="sm" variant="outline" onClick={() => resolve.mutate("dismiss")} loading={resolve.isPending && action === null}>
            <CheckCircle2 className="h-4 w-4" /> Dismiss
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAction("remove")}>
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAction("remove_and_suspend")}>Remove + suspend</Button>
          {me.role === "admin" && (
            <Button size="sm" variant="danger" onClick={() => setAction("remove_and_ban")}>
              <Ban className="h-4 w-4" /> Remove + ban
            </Button>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink-soft">
          {report.status} by {displayName(report.resolvedBy)} · {report.resolution}
        </p>
      )}
      <Modal
        open={action !== null}
        onClose={() => setAction(null)}
        title={action === "remove" ? "Remove content" : action === "remove_and_suspend" ? "Remove and suspend author" : "Remove and ban author"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAction(null)}>Cancel</Button>
            <Button variant="danger" loading={resolve.isPending} onClick={() => action && resolve.mutate(action)}>Confirm</Button>
          </>
        }
      >
        {action === "remove_and_suspend" && (
          <label className="mb-3 block text-sm">
            Suspend for
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="ml-2 h-9 rounded-lg border border-line bg-surface px-2">
              {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>)}
            </select>
          </label>
        )}
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note (optional)" maxLength={500} />
      </Modal>
    </li>
  );
}

function Reports() {
  const [status, setStatus] = useState<"open" | "resolved" | "dismissed">("open");
  const q = useCursorList<Report>(keys.reports(status), "/mod/reports", { status, limit: 15 });
  const items = flatten(q.data);
  return (
    <div>
      <Tabs value={status} onChange={setStatus} tabs={[{ value: "open", label: "Open" }, { value: "resolved", label: "Resolved" }, { value: "dismissed", label: "Dismissed" }]} />
      <div className="mt-4">
        {q.isLoading ? (
          <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="h-5 w-5" />} title={status === "open" ? "Queue is clear" : "Nothing here"}>{status === "open" ? "No open reports right now." : undefined}</EmptyState>
        ) : (
          <ul className="space-y-3">{items.map((r) => <ReportCard key={r._id} report={r} />)}</ul>
        )}
        <LoadMore onVisible={() => void q.fetchNextPage()} loading={q.isFetchingNextPage} hasMore={Boolean(q.hasNextPage)} />
      </div>
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const me = useMe()!;
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ["mod", "users"] });
  const status = useMutation({
    mutationFn: (b: { status: string; days?: number }) => api.patch(`/mod/users/${user._id}/status`, b),
    onSuccess: () => (toast.success("Account updated"), refresh()),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const role = useMutation({
    mutationFn: (r: Role) => api.patch(`/mod/users/${user._id}/role`, { role: r }),
    onSuccess: () => (toast.success("Role updated"), refresh()),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const isSelf = me._id === user._id;
  return (
    <li className="flex flex-col gap-3 border-b border-line p-4 last:border-0 sm:flex-row sm:items-center">
      <Link to={`/u/${user.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar user={user} size="md" />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-semibold">{displayName(user)}</span>
            {user.role !== "user" && <Badge tone="brand">{user.role}</Badge>}
            {user.status !== "active" && <Badge tone={user.status === "banned" ? "red" : "amber"}>{user.status}{user.suspendedUntil ? ` until ${formatDate(user.suspendedUntil)}` : ""}</Badge>}
          </span>
          <span className="block truncate text-xs text-ink-soft">
            @{user.username} · {user.email} · {user.postsCount} posts · joined {formatDate(user.createdAt)}
          </span>
        </span>
      </Link>
      {!isSelf && (
        <div className="flex flex-wrap gap-2">
          {me.role === "admin" && (
            <select value={user.role} onChange={(e) => role.mutate(e.target.value as Role)} className="h-8 rounded-lg border border-line bg-surface px-2 text-sm" aria-label={`Role for ${user.username}`}>
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          )}
          {user.status === "active" ? (
            <>
              <Button size="sm" variant="outline" onClick={() => status.mutate({ status: "suspended", days: 7 })} loading={status.isPending}>Suspend 7d</Button>
              {me.role === "admin" && <Button size="sm" variant="danger" onClick={() => status.mutate({ status: "banned" })}>Ban</Button>}
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => status.mutate({ status: "active" })} loading={status.isPending}>Restore</Button>
          )}
        </div>
      )}
    </li>
  );
}

function Users() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const dq = useDebounced(q, 300);
  const list = useCursorList<AdminUser>(keys.modUsers({ dq, statusFilter }), "/mod/users", { q: dq || undefined, status: statusFilter || undefined, limit: 20 });
  const items = flatten(list.data);
  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, username or email" className="pl-9" aria-label="Search users" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-11 rounded-lg border border-line bg-surface px-3 text-sm sm:h-10" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
      </div>
      <div className="mt-4">
        {list.isLoading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : items.length === 0 ? (
          <EmptyState title="No users found" />
        ) : (
          <ul className="rounded-xl border border-line bg-surface">{items.map((u) => <UserRow key={u._id} user={u} />)}</ul>
        )}
        <LoadMore onVisible={() => void list.fetchNextPage()} loading={list.isFetchingNextPage} hasMore={Boolean(list.hasNextPage)} />
      </div>
    </div>
  );
}

function AnalyticsView() {
  const { data, isLoading } = useQuery({ queryKey: keys.analytics, queryFn: () => api.get<Analytics>("/mod/analytics") });
  if (isLoading || !data) return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  const tiles = [
    { label: "Members", value: data.totals.users, delta: data.last7Days.users, icon: UsersIcon },
    { label: "Posts", value: data.totals.posts, delta: data.last7Days.posts, icon: FileText },
    { label: "Comments", value: data.totals.comments, delta: data.last7Days.comments, icon: MessageCircle },
    { label: "Reactions", value: data.totals.reactions, icon: Heart },
    { label: "Views", value: data.totals.views, icon: Eye },
    { label: "Open reports", value: data.totals.openReports, icon: Flag },
  ];
  const maxTag = Math.max(1, ...data.topTags.map((t) => t.posts));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <div className="flex items-center gap-2 text-sm text-ink-soft">
              <t.icon className="h-4 w-4" /> {t.label}
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{compact(t.value)}</div>
            {t.delta !== undefined && <div className="text-xs text-ink-soft">+{compact(t.delta)} in 7 days</div>}
          </Card>
        ))}
      </div>
      <section>
        <h2 className="mb-3 font-semibold">Daily activity, last 30 days</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <DailyBars title="New members" data={data.series.map((s) => ({ date: s.date, value: s.users }))} />
          <DailyBars title="Posts published" data={data.series.map((s) => ({ date: s.date, value: s.posts }))} />
          <DailyBars title="Comments" data={data.series.map((s) => ({ date: s.date, value: s.comments }))} />
        </div>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-ink-soft hover:text-ink">Show as table</summary>
          <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr><th className="px-3 py-2 font-medium">Date</th><th className="px-3 py-2 text-right font-medium">Members</th><th className="px-3 py-2 text-right font-medium">Posts</th><th className="px-3 py-2 text-right font-medium">Comments</th></tr>
              </thead>
              <tbody>
                {[...data.series].reverse().map((s) => (
                  <tr key={s.date} className="border-t border-line">
                    <td className="px-3 py-1.5">{formatDate(s.date)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{s.users}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{s.posts}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{s.comments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="font-semibold">Top tags by posts</h2>
          <ul className="mt-3 space-y-2.5">
            {data.topTags.map((t) => (
              <li key={t.tag} className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-3 text-sm">
                <Link to={`/tags/${t.tag}`} className="truncate hover:underline">#{t.tag}</Link>
                <span className="h-2.5 rounded-r bg-muted">
                  <span className="block h-full rounded-r bg-[#6366f1]" style={{ width: `${(t.posts / maxTag) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums">{t.posts}</span>
              </li>
            ))}
            {!data.topTags.length && <li className="text-sm text-ink-soft">No tags yet.</li>}
          </ul>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold">Most viewed posts</h2>
          <ol className="mt-3 space-y-3">
            {data.topPosts.map((p, i) => (
              <li key={p._id} className="flex gap-3 text-sm">
                <span className="w-4 shrink-0 text-ink-soft">{i + 1}</span>
                <Link to={`/post/${p.slug}`} className="min-w-0 flex-1 truncate hover:underline">{p.title}</Link>
                <span className="shrink-0 tabular-nums text-ink-soft">{compact(p.views)} views</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}

export default function Moderation() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "reports";
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <title>Moderation · Klyro</title>
      <h1 className="text-3xl font-extrabold tracking-tight">Moderation</h1>
      <Tabs className="mt-5" value={tab} onChange={(v) => setParams(v === "reports" ? {} : { tab: v }, { replace: true })} tabs={[{ value: "reports", label: "Reports" }, { value: "users", label: "Users" }, { value: "analytics", label: "Analytics" }]} />
      <div className="mt-6">
        {tab === "reports" && <Reports />}
        {tab === "users" && <Users />}
        {tab === "analytics" && <AnalyticsView />}
      </div>
    </div>
  );
}
