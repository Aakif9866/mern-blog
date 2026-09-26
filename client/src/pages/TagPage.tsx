import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Hash, Plus, Check } from "lucide-react";
import { flatten, useCursorList, useTagFollow } from "@/api/hooks";
import { keys } from "@/api/keys";
import { api, ApiError } from "@/lib/api";
import type { PostCard as PostCardType, Tag } from "@/lib/types";
import { useMe } from "@/store";
import { compact, plural } from "@/lib/format";
import { PostCard } from "@/components/post/PostCard";
import { FeedSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, LoadMore } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/Tabs";
import { Button, ButtonLink } from "@/components/ui/Button";

export function TagPage() {
  const { tag = "" } = useParams();
  const me = useMe();
  const [sort, setSort] = useState<"latest" | "top">("latest");
  const info = useQuery({ queryKey: keys.tag(tag), queryFn: () => api.get<Tag>(`/tags/${tag}`), retry: false });
  const posts = useCursorList<PostCardType>(keys.tagPosts(tag, sort), `/tags/${tag}/posts`, { sort });
  const follow = useTagFollow(tag);
  const list = flatten(posts.data);
  const following = info.data?.isFollowing ?? false;

  if (info.error instanceof ApiError && info.error.status === 404) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState title={`No posts tagged #${tag} yet`} action={<ButtonLink to="/tags">Browse tags</ButtonLink>} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <title>{`#${tag} · Klyro`}</title>
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:p-7">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
          <Hash className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight [overflow-wrap:anywhere]">{tag}</h1>
          {info.isLoading ? (
            <Skeleton className="mt-2 h-4 w-40" />
          ) : (
            <p className="text-sm text-ink-soft">
              {plural(info.data?.postsCount ?? 0, "post")} · {compact(info.data?.followersCount ?? 0)} following
            </p>
          )}
          {info.data?.description && <p className="mt-2 text-sm">{info.data.description}</p>}
        </div>
        {me && (
          <Button variant={following ? "outline" : "primary"} onClick={() => follow.mutate(!following)} loading={follow.isPending} aria-pressed={following}>
            {following ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {following ? "Following" : "Follow tag"}
          </Button>
        )}
      </section>
      <Tabs className="mt-6" value={sort} onChange={setSort} tabs={[{ value: "latest", label: "Latest" }, { value: "top", label: "Top" }]} />
      <div className="mt-5">
        {posts.isLoading ? (
          <FeedSkeleton />
        ) : list.length === 0 ? (
          <EmptyState title="Nothing here yet">
            {sort === "top" ? "Top posts appear once people start reacting." : "Be the first to post in this topic."}
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {list.map((p) => (
              <PostCard key={p._id} post={p} />
            ))}
            <LoadMore onVisible={() => void posts.fetchNextPage()} loading={posts.isFetchingNextPage} hasMore={Boolean(posts.hasNextPage)} />
          </div>
        )}
      </div>
    </div>
  );
}

export function TagsIndex() {
  const { data, isLoading } = useQuery({ queryKey: keys.popularTags, queryFn: () => api.get<{ items: Tag[] }>("/tags/popular") });
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <title>Tags · Klyro</title>
      <h1 className="text-3xl font-extrabold tracking-tight">Topics</h1>
      <p className="mt-1 text-ink-soft">Follow topics to shape your home feed.</p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        {data?.items.map((t) => (
          <Link key={t._id} to={`/tags/${t.slug}`} className="rounded-xl border border-line bg-surface p-4 transition-shadow hover:shadow-md">
            <div className="font-semibold">
              <span className="text-ink-soft">#</span>
              {t.slug}
            </div>
            <div className="mt-1 text-sm text-ink-soft">
              {plural(t.postsCount, "post")} · {compact(t.followersCount)} following
            </div>
          </Link>
        ))}
      </div>
      {data?.items.length === 0 && <EmptyState title="No topics yet">Topics appear once people tag their posts.</EmptyState>}
    </div>
  );
}
