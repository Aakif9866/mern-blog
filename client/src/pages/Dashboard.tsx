import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Eye, FileText, Heart, MessageCircle, MoreHorizontal, Pencil, Trash2, Undo2 } from "lucide-react";
import { flatten, useCursorList } from "@/api/hooks";
import { keys } from "@/api/keys";
import { api, errorMessage } from "@/lib/api";
import type { PostCard, PostStatus } from "@/lib/types";
import { useMe } from "@/store";
import { compact, formatDateTime, timeAgo } from "@/lib/format";
import { Tabs } from "@/components/ui/Tabs";
import { Badge, EmptyState, LoadMore, Card } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Menu, MenuItem, MenuLink } from "@/components/ui/Menu";
import { Modal } from "@/components/ui/Modal";

function Row({ post }: { post: PostCard }) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const refresh = () => void qc.invalidateQueries({ queryKey: ["my-posts"] });
  const del = useMutation({ mutationFn: () => api.delete(`/posts/${post._id}`), onSuccess: () => (toast.success("Post deleted"), setConfirm(false), refresh()), onError: (e) => toast.error(errorMessage(e)) });
  const unpublish = useMutation({ mutationFn: () => api.post(`/posts/${post._id}/unpublish`), onSuccess: () => (toast.success("Moved to drafts"), refresh()), onError: (e) => toast.error(errorMessage(e)) });
  const href = post.status === "published" ? `/post/${post.slug}` : `/write/${post._id}`;
  return (
    <li className="flex items-start gap-3 border-b border-line px-4 py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <Link to={href} className="font-semibold hover:text-brand-700 [overflow-wrap:anywhere] dark:hover:text-brand-300">
          {post.title || <span className="italic text-ink-soft">Untitled draft</span>}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
          {post.status === "draft" && <Badge>Draft</Badge>}
          {post.status === "scheduled" && (
            <Badge tone="amber">
              <CalendarClock className="mr-1 h-3 w-3" /> {formatDateTime(post.scheduledFor)}
            </Badge>
          )}
          {post.status === "published" ? (
            <>
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {compact(post.views)}</span>
              <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {compact(post.likesCount + post.helpfulCount)}</span>
              <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {compact(post.commentsCount)}</span>
            </>
          ) : (
            <span>Edited {timeAgo(post.updatedAt)}</span>
          )}
        </div>
      </div>
      <Menu
        trigger={({ toggle, open, id }) => (
          <button onClick={toggle} aria-expanded={open} aria-controls={id} className="rounded-lg p-2 text-ink-soft hover:bg-muted" aria-label="Post actions">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        )}
      >
        {(close) => (
          <>
            <MenuLink to={`/write/${post._id}`} onClick={close} icon={<Pencil className="h-4 w-4" />}>Edit</MenuLink>
            {post.status === "published" && (
              <MenuItem onClick={() => (close(), unpublish.mutate())} icon={<Undo2 className="h-4 w-4" />}>Unpublish</MenuItem>
            )}
            <MenuItem danger onClick={() => (close(), setConfirm(true))} icon={<Trash2 className="h-4 w-4" />}>Delete</MenuItem>
          </>
        )}
      </Menu>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete this post?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => del.mutate()} loading={del.isPending}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">“{post.title || "Untitled draft"}” will be removed.</p>
      </Modal>
    </li>
  );
}

export default function Dashboard() {
  const me = useMe()!;
  const [status, setStatus] = useState<PostStatus>("published");
  const q = useCursorList<PostCard>(keys.myPosts(status), "/posts/mine", { status, limit: 20 });
  const items = flatten(q.data);
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <title>My posts · Klyro</title>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">My posts</h1>
        <ButtonLink to="/write">New post</ButtonLink>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: "Posts", value: me.postsCount },
          { label: "Followers", value: me.followersCount },
          { label: "Following", value: me.followingCount },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-2xl font-bold tabular-nums">{compact(s.value)}</div>
            <div className="text-sm text-ink-soft">{s.label}</div>
          </Card>
        ))}
      </div>
      <Tabs className="mt-6" value={status} onChange={setStatus} tabs={[{ value: "published", label: "Published" }, { value: "draft", label: "Drafts" }, { value: "scheduled", label: "Scheduled" }]} />
      <div className="mt-4">
        {q.isLoading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<FileText className="h-5 w-5" />} title={`No ${status === "draft" ? "drafts" : status + " posts"}`} action={<ButtonLink to="/write" variant="outline">Start writing</ButtonLink>} />
        ) : (
          <ul className="rounded-xl border border-line bg-surface">
            {items.map((p) => (
              <Row key={p._id} post={p} />
            ))}
          </ul>
        )}
        <LoadMore onVisible={() => void q.fetchNextPage()} loading={q.isFetchingNextPage} hasMore={Boolean(q.hasNextPage)} />
      </div>
    </div>
  );
}
