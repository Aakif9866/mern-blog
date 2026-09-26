import { Link } from "react-router";
import { Heart, Lightbulb, MessageCircle } from "lucide-react";
import type { PostCard as PostCardType } from "@/lib/types";
import { Avatar } from "../ui/Avatar";
import { TagChip } from "../ui/misc";
import { compact, displayName, formatDate } from "@/lib/format";

export function PostCard({ post, showCover = true }: { post: PostCardType; showCover?: boolean }) {
  const author = post.author;
  return (
    <article className="group relative rounded-xl border border-line bg-surface p-4 transition-shadow hover:shadow-md sm:p-5">
      <div className="flex items-center gap-2.5 text-sm">
        <Link to={`/u/${author.username}`} className="relative z-10 flex min-w-0 items-center gap-2.5">
          <Avatar user={author} size="sm" />
          <span className="truncate font-medium hover:underline">{displayName(author)}</span>
        </Link>
        <span className="shrink-0 text-ink-soft">· {formatDate(post.publishedAt ?? post.createdAt)}</span>
      </div>

      <div className="mt-3 flex gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold leading-snug tracking-tight [overflow-wrap:anywhere] sm:text-xl">
            <Link to={`/post/${post.slug}`} className="after:absolute after:inset-0 group-hover:text-brand-700 dark:group-hover:text-brand-300">
              {post.title}
            </Link>
          </h2>
          {post.excerpt && <p className="mt-1.5 line-clamp-2 text-[15px] text-ink-soft">{post.excerpt}</p>}
        </div>
        {showCover && post.coverImage && (
          <img src={post.coverImage} alt="" loading="lazy" className="hidden h-24 w-32 shrink-0 rounded-lg bg-muted object-cover sm:block" />
        )}
      </div>

      {post.tags.length > 0 && (
        <div className="relative z-10 mt-3 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 4).map((t) => (
            <TagChip key={t} tag={t} />
          ))}
        </div>
      )}

      <div className="mt-3.5 flex items-center gap-4 text-sm text-ink-soft">
        <span className="flex items-center gap-1" title="Likes">
          <Heart className="h-4 w-4" /> {compact(post.likesCount)}
        </span>
        {post.helpfulCount > 0 && (
          <span className="flex items-center gap-1" title="Found helpful">
            <Lightbulb className="h-4 w-4" /> {compact(post.helpfulCount)}
          </span>
        )}
        <span className="flex items-center gap-1" title="Comments">
          <MessageCircle className="h-4 w-4" /> {compact(post.commentsCount)}
        </span>
        <span className="ml-auto text-xs">{post.readTime} min read</span>
      </div>
    </article>
  );
}
