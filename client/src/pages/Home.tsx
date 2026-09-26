import { useSearchParams, Link } from "react-router";
import { Flame, Newspaper, PenSquare, Sparkles, Users } from "lucide-react";
import { flatten, useCursorList, useSuggestions, useTrendingTags } from "@/api/hooks";
import { keys } from "@/api/keys";
import type { PostCard as PostCardType } from "@/lib/types";
import { useAppSelector, useMe } from "@/store";
import { PostCard } from "@/components/post/PostCard";
import { FeedSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, LoadMore, TagChip, Card } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/Tabs";
import { ButtonLink } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { FollowButton } from "@/components/post/FollowButton";
import { LogoMark } from "@/components/ui/Logo";
import { displayName } from "@/lib/format";

type FeedType = "following" | "latest" | "trending";

/** Real recent posts, shown as a stacked preview beside the hero on wide screens. */
function HeroPreview() {
  const q = useCursorList<PostCardType>(keys.feed("latest"), "/posts", { type: "latest", limit: 3 });
  const posts = flatten(q.data).slice(0, 3);
  if (posts.length < 2) return null;
  return (
    <div className="relative hidden min-h-[22rem] lg:row-span-2 lg:block" aria-hidden="true">
      {posts.map((p, i) => (
        <div
          key={p._id}
          className="absolute w-[24rem] rounded-2xl border border-line bg-surface p-5 shadow-xl"
          style={{ top: `${i * 7.5}rem`, left: `${i % 2 ? 3.5 : 0}rem`, transform: `rotate(${[-2, 1.5, -1][i]}deg)` }}
        >
          <div className="flex items-center gap-2 text-sm">
            <Avatar user={p.author} size="xs" />
            <span className="font-medium">{displayName(p.author)}</span>
          </div>
          <div className="mt-2 line-clamp-2 font-bold leading-snug">{p.title}</div>
          <div className="mt-3 flex gap-1.5">
            {p.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs text-ink-soft">#{t}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-surface">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_70%_-10%,rgba(99,102,241,0.18),transparent)]" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-soft">
            <LogoMark className="h-4 w-4" /> Klyro community
          </div>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Where ideas <span className="bg-gradient-to-r from-brand-600 to-violet-500 bg-clip-text text-transparent">come together.</span>
          </h1>
          <p className="mt-5 text-lg text-ink-soft sm:text-xl">
            Write about what you're building and learning. Follow people and topics you care about, and join discussions that make everyone sharper.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/sign-up" size="lg">
              Start writing for free
            </ButtonLink>
            <ButtonLink to="/?feed=trending" variant="outline" size="lg">
              Explore trending
            </ButtonLink>
          </div>
        </div>
        <HeroPreview />
        <dl className="mt-12 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3 lg:col-start-1">
          {[
            { icon: PenSquare, title: "A writer-first editor", text: "Markdown shortcuts, code highlighting, drafts that save themselves." },
            { icon: Users, title: "Your people, your topics", text: "Follow writers and tags to shape a feed worth reading." },
            { icon: Sparkles, title: "Smart discovery", text: "TL;DRs, related posts and trending topics help good ideas travel." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-line bg-surface/70 p-4">
              <f.icon className="h-5 w-5 text-brand-600 dark:text-brand-300" />
              <dt className="mt-2 font-semibold">{f.title}</dt>
              <dd className="mt-1 text-sm text-ink-soft">{f.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Feed({ type }: { type: FeedType }) {
  const q = useCursorList<PostCardType>(keys.feed(type), "/posts", { type });
  const posts = flatten(q.data);
  if (q.isLoading) return <FeedSkeleton />;
  if (q.isError) return <EmptyState title="Couldn't load posts">Check your connection and try again.</EmptyState>;
  if (!posts.length) {
    return type === "following" ? (
      <EmptyState icon={<Users className="h-5 w-5" />} title="Your following feed is empty" action={<ButtonLink to="/tags" variant="outline">Browse topics</ButtonLink>}>
        Follow writers and tags and their posts will show up here.
      </EmptyState>
    ) : (
      <EmptyState icon={<Newspaper className="h-5 w-5" />} title="No posts yet" action={<ButtonLink to="/write">Write the first one</ButtonLink>}>
        Be the first to share an idea.
      </EmptyState>
    );
  }
  return (
    <div className="space-y-4">
      {posts.map((p) => (
        <PostCard key={p._id} post={p} />
      ))}
      <LoadMore onVisible={() => void q.fetchNextPage()} loading={q.isFetchingNextPage} hasMore={Boolean(q.hasNextPage)} />
    </div>
  );
}

function Sidebar() {
  const me = useMe();
  const tags = useTrendingTags();
  const people = useSuggestions();
  return (
    <aside className="space-y-5">
      {me && (
        <Card className="p-4">
          <p className="text-sm text-ink-soft">Have something to share?</p>
          <ButtonLink to="/write" className="mt-3 w-full">
            <PenSquare className="h-4 w-4" /> Write a post
          </ButtonLink>
        </Card>
      )}
      <Card className="p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Flame className="h-4 w-4 text-orange-500" /> Trending topics
        </h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.isLoading && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-7 w-20 rounded-full" />)}
          {tags.data?.items.map((t) => (
            <TagChip key={t._id} tag={t.slug} />
          ))}
          {tags.data?.items.length === 0 && <p className="text-sm text-ink-soft">Topics appear as people post.</p>}
        </div>
        <Link to="/tags" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
          See all tags
        </Link>
      </Card>
      {(people.data?.items.length ?? 0) > 0 && (
        <Card className="p-4">
          <h2 className="font-semibold">Writers to follow</h2>
          <ul className="mt-3 space-y-3">
            {people.data!.items.slice(0, 5).map((u) => (
              <li key={u._id} className="flex items-center gap-3">
                <Link to={`/u/${u.username}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Avatar user={u} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{displayName(u)}</span>
                    <span className="block truncate text-xs text-ink-soft">@{u.username}</span>
                  </span>
                </Link>
                {me && <FollowButton username={u.username} following={false} />}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </aside>
  );
}

export default function Home() {
  const me = useMe();
  const status = useAppSelector((s) => s.auth.status);
  const [params, setParams] = useSearchParams();
  const requested = params.get("feed") as FeedType | null;
  const type: FeedType = requested && ["following", "latest", "trending"].includes(requested) ? requested : me ? "following" : "latest";
  const tabs = [
    ...(me ? [{ value: "following" as const, label: "Following" }] : []),
    { value: "latest" as const, label: "Latest" },
    { value: "trending" as const, label: "Trending" },
  ];

  return (
    <>
      <title>{me ? "Home · Klyro" : "Klyro — Where ideas come together."}</title>
      {status === "guest" && <Hero />}
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Tabs tabs={tabs} value={type} onChange={(v) => setParams(v === (me ? "following" : "latest") ? {} : { feed: v }, { replace: true })} className="mb-5" />
          {status === "loading" ? <FeedSkeleton /> : <Feed key={type} type={type} />}
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <Sidebar />
          </div>
        </div>
      </div>
    </>
  );
}
