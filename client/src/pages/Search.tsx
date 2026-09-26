import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { api, qs } from "@/lib/api";
import type { PostCard as PostCardType, PublicUser, Tag } from "@/lib/types";
import { PostCard } from "@/components/post/PostCard";
import { Tabs } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/Input";
import { FeedSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, LoadMore } from "@/components/ui/misc";
import { Avatar } from "@/components/ui/Avatar";
import { displayName, plural } from "@/lib/format";

type SearchType = "posts" | "users" | "tags";

export default function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const type = (params.get("type") as SearchType) || "posts";
  const sort = params.get("sort") ?? "relevance";
  const [text, setText] = useState(q);
  // Keep the box in sync when the URL query changes (e.g. from the search overlay).
  const [syncedQ, setSyncedQ] = useState(q);
  if (q !== syncedQ) {
    setSyncedQ(q);
    setText(q);
  }

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: true });
  };

  const posts = useInfiniteQuery({
    queryKey: ["search", "posts", q, sort],
    queryFn: ({ pageParam }) => api.get<{ items: PostCardType[]; hasMore: boolean; page: number }>(`/search${qs({ q, type: "posts", sort, page: pageParam })}`),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: Boolean(q) && type === "posts",
  });
  const users = useQuery({ queryKey: ["search", "users", q], queryFn: () => api.get<{ items: PublicUser[] }>(`/search${qs({ q, type: "users", limit: 30 })}`), enabled: Boolean(q) && type === "users" });
  const tags = useQuery({ queryKey: ["search", "tags", q], queryFn: () => api.get<{ items: Tag[] }>(`/search${qs({ q, type: "tags", limit: 30 })}`), enabled: Boolean(q) && type === "tags" });
  const postItems = posts.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <title>{q ? `“${q}” · Search · Klyro` : "Search · Klyro"}</title>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: text.trim() });
        }}
        className="relative"
        role="search"
      >
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search Klyro" className="h-12 pl-10 text-base sm:h-12" aria-label="Search" enterKeyHint="search" />
      </form>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <Tabs value={type} onChange={(v) => update({ type: v === "posts" ? "" : v })} tabs={[{ value: "posts", label: "Posts" }, { value: "users", label: "People" }, { value: "tags", label: "Tags" }]} className="flex-1" />
        {type === "posts" && (
          <select value={sort} onChange={(e) => update({ sort: e.target.value === "relevance" ? "" : e.target.value })} className="h-9 rounded-lg border border-line bg-surface px-2 text-sm" aria-label="Sort results">
            <option value="relevance">Most relevant</option>
            <option value="latest">Newest</option>
            <option value="top">Most liked</option>
          </select>
        )}
      </div>
      <div className="mt-5">
        {!q ? (
          <EmptyState icon={<SearchIcon className="h-5 w-5" />} title="Search posts, people and topics" />
        ) : type === "posts" ? (
          posts.isLoading ? (
            <FeedSkeleton />
          ) : postItems.length === 0 ? (
            <EmptyState title={`No posts match “${q}”`}>Try different words, or search people and tags.</EmptyState>
          ) : (
            <div className="space-y-4">
              {postItems.map((p) => (
                <PostCard key={p._id} post={p} />
              ))}
              <LoadMore onVisible={() => void posts.fetchNextPage()} loading={posts.isFetchingNextPage} hasMore={Boolean(posts.hasNextPage)} />
            </div>
          )
        ) : type === "users" ? (
          users.isLoading ? (
            <FeedSkeleton count={2} />
          ) : !users.data?.items.length ? (
            <EmptyState title={`No people match “${q}”`} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {users.data.items.map((u) => (
                <li key={u._id}>
                  <Link to={`/u/${u.username}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4 hover:shadow-md">
                    <Avatar user={u} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{displayName(u)}</span>
                      <span className="block truncate text-sm text-ink-soft">@{u.username}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : tags.isLoading ? (
          <FeedSkeleton count={2} />
        ) : !tags.data?.items.length ? (
          <EmptyState title={`No tags match “${q}”`} />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tags.data.items.map((t) => (
              <li key={t._id}>
                <Link to={`/tags/${t.slug}`} className="block rounded-xl border border-line bg-surface p-4 hover:shadow-md">
                  <div className="font-semibold">#{t.slug}</div>
                  <div className="text-sm text-ink-soft">{plural(t.postsCount, "post")}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
