import { useState } from "react";
import { useNavigate } from "react-router";
import { Bookmark, FolderOpen, Heart, Lightbulb, MessageCircle } from "lucide-react";
import clsx from "clsx";
import type { Post, ViewerState } from "@/lib/types";
import { useBookmark, useReaction } from "@/api/hooks";
import { useMe } from "@/store";
import { compact } from "@/lib/format";
import { ShareMenu } from "./ShareMenu";
import { CollectionPicker } from "./CollectionPicker";

function Toggle({ active, onClick, label, count, icon: Icon, activeClass }: { active: boolean; onClick: () => void; label: string; count?: number; icon: typeof Heart; activeClass: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${label}${count !== undefined ? ` (${count})` : ""}`}
      className={clsx("flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors", active ? activeClass : "text-ink-soft hover:bg-muted hover:text-ink")}
    >
      <Icon className={clsx("h-5 w-5", active && "fill-current")} />
      {count !== undefined && <span className="tabular-nums">{compact(count)}</span>}
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function ReactionBar({ post, viewer, onComment }: { post: Post; viewer: ViewerState; onComment: () => void }) {
  const me = useMe();
  const navigate = useNavigate();
  const react = useReaction(post.slug);
  const bookmark = useBookmark(post.slug);
  const [picker, setPicker] = useState(false);
  const guard = (fn: () => void) => () => (me ? fn() : navigate(`/sign-in?next=/post/${post.slug}`));

  return (
    <div className="flex flex-wrap items-center gap-1 border-y border-line py-1.5">
      <Toggle label="Like" icon={Heart} active={viewer.liked} count={post.likesCount} activeClass="text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400" onClick={guard(() => react.mutate({ postId: post._id, type: "like" }))} />
      <Toggle label="Helpful" icon={Lightbulb} active={viewer.helpful} count={post.helpfulCount} activeClass="text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400" onClick={guard(() => react.mutate({ postId: post._id, type: "helpful" }))} />
      <button onClick={onComment} className="flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-muted hover:text-ink" aria-label={`Comments (${post.commentsCount})`}>
        <MessageCircle className="h-5 w-5" />
        <span className="tabular-nums">{compact(post.commentsCount)}</span>
      </button>
      <div className="ml-auto flex items-center">
        <Toggle label={viewer.bookmarked ? "Remove bookmark" : "Bookmark"} icon={Bookmark} active={viewer.bookmarked} activeClass="text-brand-600 bg-brand-50 dark:bg-brand-900/40 dark:text-brand-300" onClick={guard(() => bookmark.mutate({ postId: post._id, on: !viewer.bookmarked }))} />
        {viewer.bookmarked && (
          <button onClick={() => setPicker(true)} className="rounded-lg p-2.5 text-ink-soft hover:bg-muted hover:text-ink" aria-label="Choose collection">
            <FolderOpen className="h-5 w-5" />
          </button>
        )}
        <ShareMenu title={post.title} url={`${window.location.origin}/post/${post.slug}`} />
      </div>
      <CollectionPicker open={picker} onClose={() => setPicker(false)} current={viewer.bookmarkList ?? null} onPick={(list) => bookmark.mutate({ postId: post._id, on: true, list })} />
    </div>
  );
}
