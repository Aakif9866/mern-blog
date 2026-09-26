import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, Eye, Flag, History, MoreHorizontal, Pencil, Sparkles, Trash2, ListOrdered } from "lucide-react";
import { usePost, useRelated, useSeries } from "@/api/hooks";
import { keys } from "@/api/keys";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { Revision } from "@/lib/types";
import { useMe } from "@/store";
import { compact, displayName, formatDate, formatDateTime, timeAgo } from "@/lib/format";
import { PostContent } from "@/components/post/PostContent";
import { ReactionBar } from "@/components/post/ReactionBar";
import { FollowButton } from "@/components/post/FollowButton";
import { ReportDialog } from "@/components/post/ReportDialog";
import { PostCard } from "@/components/post/PostCard";
import { CommentSection } from "@/components/comments/CommentSection";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, EmptyState, TagChip } from "@/components/ui/misc";
import { Menu, MenuItem, MenuLink } from "@/components/ui/Menu";
import { Modal } from "@/components/ui/Modal";
import { Button, ButtonLink } from "@/components/ui/Button";
import { PostPageSkeleton } from "@/components/ui/Skeleton";

function SeriesNav({ seriesId, postId }: { seriesId: string; postId: string }) {
  const { data } = useSeries(seriesId);
  if (!data?.posts?.length) return null;
  const idx = data.posts.findIndex((p) => p._id === postId);
  return (
    <details className="mt-6 rounded-xl border border-line bg-surface" open={data.posts.length <= 6}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm">
        <ListOrdered className="h-4 w-4 text-brand-600" />
        <span className="min-w-0 flex-1 truncate">
          Part {idx + 1} of {data.posts.length} in <strong>{data.title}</strong>
        </span>
      </summary>
      <ol className="border-t border-line px-2 py-2">
        {data.posts.map((p, i) => (
          <li key={p._id}>
            <Link to={`/post/${p.slug}`} className={`flex gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted ${p._id === postId ? "font-semibold text-brand-700 dark:text-brand-300" : ""}`}>
              <span className="w-5 shrink-0 text-right text-ink-soft">{i + 1}.</span>
              <span className="min-w-0 flex-1">{p.title}</span>
            </Link>
          </li>
        ))}
      </ol>
    </details>
  );
}

function RevisionsModal({ postId, open, onClose }: { postId: string; open: boolean; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: keys.revisions(postId), queryFn: () => api.get<{ items: Revision[] }>(`/posts/${postId}/revisions`), enabled: open });
  const [selected, setSelected] = useState<Revision | null>(null);
  return (
    <Modal open={open} onClose={() => (setSelected(null), onClose())} title={selected ? `Version from ${formatDateTime(selected.createdAt)}` : "Edit history"} size="lg">
      {selected ? (
        <div>
          <button onClick={() => setSelected(null)} className="mb-4 text-sm font-medium text-brand-600 hover:underline">
            ← All versions
          </button>
          <h3 className="mb-3 text-xl font-bold">{selected.title}</h3>
          <PostContent html={selected.content} />
        </div>
      ) : isLoading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : !data?.items.length ? (
        <p className="text-sm text-ink-soft">No earlier versions. Edits made after publishing appear here.</p>
      ) : (
        <ul className="divide-y divide-line">
          {data.items.map((r) => (
            <li key={r._id}>
              <button onClick={() => setSelected(r)} className="flex w-full items-center justify-between gap-3 py-3 text-left hover:text-brand-700">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.title}</span>
                  <span className="text-xs text-ink-soft">
                    Replaced {timeAgo(r.createdAt)} by {displayName(r.editor)}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-ink-soft">View</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export default function PostPage() {
  const { slug = "" } = useParams();
  const me = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, error } = usePost(slug);
  const related = useRelated(data?.post.status === "published" ? data.post._id : undefined);
  const commentsRef = useRef<HTMLElement>(null);
  const [reporting, setReporting] = useState(false);
  const [history, setHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const postId = data?.post._id;
  const published = data?.post.status === "published";
  useEffect(() => {
    if (postId && published) void api.post(`/posts/${postId}/view`).catch(() => undefined);
  }, [postId, published]);

  const remove = useMutation({
    mutationFn: () => api.delete(`/posts/${postId}`),
    onSuccess: () => {
      toast.success("Post deleted");
      void qc.invalidateQueries({ queryKey: ["feed"] });
      void qc.invalidateQueries({ queryKey: ["my-posts"] });
      navigate("/dashboard");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading) return <PostPageSkeleton />;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <title>Post not found · Klyro</title>
        <EmptyState title={error instanceof ApiError && error.status === 404 ? "This post doesn't exist" : "Couldn't load this post"} action={<ButtonLink to="/">Back to home</ButtonLink>}>
          It may have been deleted, or the link might be wrong.
        </EmptyState>
      </div>
    );
  }

  const { post, viewer } = data;
  const isAuthor = me?._id === post.author._id;
  const canModerate = me && (me.role === "moderator" || me.role === "admin");
  const seriesId = post.series && typeof post.series === "object" ? post.series._id : null;

  return (
    <article className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <title>{`${post.title} · Klyro`}</title>
      <meta name="description" content={post.tldr || post.excerpt} />

      {post.status !== "published" && (
        <div className="mb-5 rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {post.status === "scheduled" ? `Scheduled to publish ${formatDateTime(post.scheduledFor)}. Only you can see it.` : "This is a draft. Only you can see it."}
        </div>
      )}

      {post.coverImage && <img src={post.coverImage} alt="" className="mb-6 aspect-[2/1] w-full rounded-xl bg-muted object-cover sm:mb-8" />}

      <div className="flex flex-wrap gap-1.5">
        {post.tags.map((t) => (
          <TagChip key={t} tag={t} />
        ))}
      </div>
      <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-4xl lg:text-[2.75rem]">{post.title}</h1>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
        <Link to={`/u/${post.author.username}`} className="flex min-w-0 items-center gap-3">
          <Avatar user={post.author} size="md" />
          <div className="min-w-0">
            <div className="truncate font-semibold hover:underline">{displayName(post.author)}</div>
            <div className="flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
              <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {post.readTime} min read
              </span>
              {post.status === "published" && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> {compact(post.views)}
                </span>
              )}
              {post.editedAt && <span title={formatDateTime(post.editedAt)}>· Edited</span>}
            </div>
          </div>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          {!isAuthor && <FollowButton username={post.author.username} following={viewer.followingAuthor} />}
          {me && (
            <Menu
              trigger={({ toggle, open, id }) => (
                <button onClick={toggle} aria-expanded={open} aria-controls={id} className="rounded-lg p-2 text-ink-soft hover:bg-muted" aria-label="Post actions">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              )}
            >
              {(close) => (
                <>
                  {isAuthor && (
                    <MenuLink to={`/write/${post._id}`} onClick={close} icon={<Pencil className="h-4 w-4" />}>
                      Edit post
                    </MenuLink>
                  )}
                  {(isAuthor || canModerate) && post.editedAt && (
                    <MenuItem onClick={() => (close(), setHistory(true))} icon={<History className="h-4 w-4" />}>
                      Edit history
                    </MenuItem>
                  )}
                  {(isAuthor || canModerate) && (
                    <MenuItem danger onClick={() => (close(), setConfirmDelete(true))} icon={<Trash2 className="h-4 w-4" />}>
                      Delete post
                    </MenuItem>
                  )}
                  {!isAuthor && (
                    <MenuItem onClick={() => (close(), setReporting(true))} icon={<Flag className="h-4 w-4" />}>
                      Report post
                    </MenuItem>
                  )}
                </>
              )}
            </Menu>
          )}
        </div>
      </div>

      {post.tldr && (
        <aside className="mt-6 rounded-xl border border-brand-200/70 bg-brand-50/70 p-4 dark:border-brand-900 dark:bg-brand-950/30">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-brand-300">
            <Sparkles className="h-4 w-4" /> TL;DR <Badge tone="brand">AI summary</Badge>
          </div>
          <p className="mt-1.5 text-[15px] leading-relaxed">{post.tldr}</p>
        </aside>
      )}

      {seriesId && <SeriesNav seriesId={seriesId} postId={post._id} />}

      <div className="mt-8">
        <PostContent html={post.content} />
      </div>

      {post.status === "published" && (
        <>
          <div className="mt-10">
            <ReactionBar post={post} viewer={viewer} onComment={() => commentsRef.current?.scrollIntoView({ behavior: "smooth" })} />
          </div>
          <div className="mt-8">
            <CommentSection ref={commentsRef} postId={post._id} count={post.commentsCount} slug={post.slug} />
          </div>
          {(related.data?.items.length ?? 0) > 0 && (
            <section className="mt-12 border-t border-line pt-8" aria-labelledby="related-title">
              <h2 id="related-title" className="text-lg font-bold">
                Related posts
              </h2>
              <div className="mt-4 grid gap-4">
                {related.data!.items.map((p) => (
                  <PostCard key={p._id} post={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <ReportDialog open={reporting} onClose={() => setReporting(false)} targetType="post" targetId={post._id} />
      <RevisionsModal postId={post._id} open={history} onClose={() => setHistory(false)} />
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this post?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
              Delete post
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">The post will be removed from Klyro for everyone.</p>
      </Modal>
    </article>
  );
}
