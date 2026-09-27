import { forwardRef, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, Heart, MessageSquareReply, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import type { CommentItem } from "@/lib/types";
import { useCommentLike, useComments } from "@/api/hooks";
import { keys } from "@/api/keys";
import { api, errorMessage } from "@/lib/api";
import { useMe } from "@/store";
import { displayName, timeAgo } from "@/lib/format";
import { Avatar } from "../ui/Avatar";
import { Button, ButtonLink } from "../ui/Button";
import { LoadMore } from "../ui/misc";
import { Menu, MenuItem } from "../ui/Menu";
import { Modal } from "../ui/Modal";
import { MentionTextarea } from "./MentionTextarea";
import { CommentText } from "./CommentText";
import { ReportDialog } from "../post/ReportDialog";
import { Skeleton } from "../ui/Skeleton";
import { GuestNotice } from "../GuestNotice";


interface Node extends CommentItem {
  children: Node[];
}

function Composer({ postId, parentId, onDone, autoFocus, placeholder }: { postId: string; parentId?: string; onDone?: () => void; autoFocus?: boolean; placeholder?: string }) {
  const [text, setText] = useState("");
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: () => api.post<CommentItem>("/comments", { postId, parentId: parentId ?? null, content: text.trim() }),
    onSuccess: () => {
      setText("");
      void qc.invalidateQueries({ queryKey: keys.comments(postId) });
      void qc.invalidateQueries({ queryKey: ["post"] });
      onDone?.();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const submit = () => text.trim() && !create.isPending && create.mutate();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-2"
    >
      <MentionTextarea value={text} onChange={setText} onSubmit={submit} rows={parentId ? 2 : 3} autoFocus={autoFocus} placeholder={placeholder ?? "Add to the discussion. Use @ to mention someone."} aria-label={parentId ? "Write a reply" : "Write a comment"} />
      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto text-xs text-ink-soft">{text.length > 1800 ? `${2000 - text.length} characters left` : ""}</span>
        {onDone && (
          <Button variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" loading={create.isPending} disabled={!text.trim()}>
          {parentId ? "Reply" : "Comment"}
        </Button>
      </div>
    </form>
  );
}

function CommentView({ node, postId, depth }: { node: Node; postId: string; depth: number }) {
  const me = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const like = useCommentLike(postId);
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.content);
  const [reporting, setReporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isMine = me && node.author && me._id === node.author._id;
  const canModerate = me && (me.role === "moderator" || me.role === "admin");

  const refresh = () => void qc.invalidateQueries({ queryKey: keys.comments(postId) });
  const edit = useMutation({
    mutationFn: () => api.patch(`/comments/${node._id}`, { content: draft.trim() }),
    onSuccess: () => {
      setEditing(false);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => api.delete(`/comments/${node._id}`),
    onSuccess: () => {
      setConfirmDelete(false);
      refresh();
      void qc.invalidateQueries({ queryKey: ["post"] });
      toast.success("Comment deleted");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  // Deleted comments with no replies disappear; with replies they stay as a placeholder so the thread makes sense.
  if (node.deleted && node.children.length === 0) return null;

  return (
    <li className={clsx(depth > 0 && "mt-4")}>
      <div className="flex gap-3">
        {node.author ? (
          <Link to={`/u/${node.author.username}`} className="shrink-0">
            <Avatar user={node.author} size="sm" />
          </Link>
        ) : (
          <Avatar user={null} size="sm" />
        )}
        <div className="min-w-0 flex-1">
          {node.deleted ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm italic text-ink-soft">This comment was deleted.</p>
          ) : (
            <div className="rounded-xl bg-muted/60 px-3.5 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <Link to={`/u/${node.author?.username}`} className="truncate font-semibold hover:underline">
                  {displayName(node.author)}
                </Link>
                <span className="shrink-0 text-xs text-ink-soft">
                  {timeAgo(node.createdAt)}
                  {node.editedAt && " · edited"}
                </span>
                {me && (
                  <Menu
                    trigger={({ toggle, open, id }) => (
                      <button onClick={toggle} aria-expanded={open} aria-controls={id} className="-my-1.5 -mr-2 ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-line/60" aria-label="Comment actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    )}
                  >
                    {(close) => (
                      <>
                        {isMine && (
                          <MenuItem icon={<Pencil className="h-4 w-4" />} onClick={() => (close(), setEditing(true), setDraft(node.content))}>
                            Edit
                          </MenuItem>
                        )}
                        {(isMine || canModerate) && (
                          <MenuItem danger icon={<Trash2 className="h-4 w-4" />} onClick={() => (close(), setConfirmDelete(true))}>
                            Delete
                          </MenuItem>
                        )}
                        {!isMine && !me.isGuest && (
                          <MenuItem icon={<Flag className="h-4 w-4" />} onClick={() => (close(), setReporting(true))}>
                            Report
                          </MenuItem>
                        )}
                      </>
                    )}
                  </Menu>
                )}
              </div>
              {editing ? (
                <div className="mt-2 space-y-2">
                  <MentionTextarea value={draft} onChange={setDraft} rows={3} autoFocus aria-label="Edit comment" />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" loading={edit.isPending} disabled={!draft.trim()} onClick={() => edit.mutate()}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-1">
                  <CommentText text={node.content} />
                </div>
              )}
            </div>
          )}
          {!node.deleted && (
            <div className="mt-1 flex items-center gap-1 text-sm">
              <button
                onClick={() => (me ? like.mutate(node._id) : navigate("/sign-in"))}
                aria-pressed={node.liked}
                className={clsx("flex items-center gap-1 rounded-md px-2 py-1.5", node.liked ? "text-rose-600 dark:text-rose-400" : "text-ink-soft hover:bg-muted")}
              >
                <Heart className={clsx("h-4 w-4", node.liked && "fill-current")} />
                {node.likesCount > 0 && node.likesCount}
                <span className="sr-only">Like</span>
              </button>
              <button onClick={() => (!me ? navigate("/sign-in") : me.isGuest ? navigate("/keep-account") : setReplying((r) => !r))} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-ink-soft hover:bg-muted">
                <MessageSquareReply className="h-4 w-4" />
                Reply
              </button>
            </div>
          )}
          {replying && (
            <div className="mt-2">
              <Composer postId={postId} parentId={node._id} autoFocus onDone={() => setReplying(false)} placeholder={`Reply to ${displayName(node.author)}…`} />
            </div>
          )}
          {node.children.length > 0 && (
            <ul className={clsx("border-l-2 border-line", depth < 2 ? "pl-3 sm:pl-5" : "pl-2 sm:pl-3")}>
              {node.children.map((c) => (
                <CommentView key={c._id} node={c} postId={postId} depth={depth + 1} />
              ))}
            </ul>
          )}
        </div>
      </div>
      <ReportDialog open={reporting} onClose={() => setReporting(false)} targetType="comment" targetId={node._id} />
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete comment?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">This can't be undone. Replies to it will stay visible.</p>
      </Modal>
    </li>
  );
}

export const CommentSection = forwardRef<HTMLElement, { postId: string; count: number; slug: string }>(function CommentSection({ postId, count, slug }, ref) {
  const me = useMe();
  const q = useComments(postId);

  const tree = useMemo(() => {
    const pages = q.data?.pages ?? [];
    const roots = pages.flatMap((p) => p.items);
    const replies = pages.flatMap((p) => p.replies);
    const byId = new Map<string, Node>();
    for (const c of [...roots, ...replies]) byId.set(c._id, { ...c, children: [] });
    for (const c of replies) {
      const parent = c.parent ? byId.get(c.parent) : undefined;
      const node = byId.get(c._id);
      if (parent && node) parent.children.push(node);
    }
    return roots.map((r) => byId.get(r._id)!);
  }, [q.data]);

  return (
    <section ref={ref} id="comments" className="scroll-mt-20" aria-labelledby="comments-title">
      <h2 id="comments-title" className="text-lg font-bold">
        Discussion <span className="text-ink-soft">({count})</span>
      </h2>
      <div className="mt-4">
        {me?.isGuest ? (
          <GuestNotice action="comment" />
        ) : me ? (
          me.emailVerified && me.status === "active" ? (
            <div className="flex gap-3">
              <Avatar user={me} size="sm" className="hidden sm:inline-flex" />
              <div className="min-w-0 flex-1">
                <Composer postId={postId} />
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-muted px-4 py-3 text-sm text-ink-soft">{me.status !== "active" ? "Your account can't comment right now." : "Verify your email to join the discussion."}</p>
          )
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
            <p className="text-sm text-ink-soft">Sign in to join the discussion.</p>
            <ButtonLink to={`/sign-in?next=/post/${slug}`} size="sm" className="sm:ml-auto">
              Sign in
            </ButtonLink>
          </div>
        )}
      </div>
      <div className="mt-6">
        {q.isLoading ? (
          <div className="space-y-5">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-16 flex-1 rounded-xl" />
              </div>
            ))}
          </div>
        ) : tree.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">No comments yet. Start the conversation.</p>
        ) : (
          <ul className="space-y-5">
            {tree.map((n) => (
              <CommentView key={n._id} node={n} postId={postId} depth={0} />
            ))}
          </ul>
        )}
        <LoadMore onVisible={() => void q.fetchNextPage()} loading={q.isFetchingNextPage} hasMore={Boolean(q.hasNextPage)} />
      </div>
    </section>
  );
});
