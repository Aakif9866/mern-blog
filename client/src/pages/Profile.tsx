import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Globe, MapPin, Pencil } from "lucide-react";
import { flatten, useCursorList, useProfile } from "@/api/hooks";
import { keys } from "@/api/keys";
import { api, ApiError } from "@/lib/api";
import type { PostCard as PostCardType, PublicUser, Series } from "@/lib/types";
import { compact, displayName, formatDate } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, EmptyState, LoadMore } from "@/components/ui/misc";
import { FeedSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PostCard } from "@/components/post/PostCard";
import { FollowButton } from "@/components/post/FollowButton";
import { useMe } from "@/store";

function Connections({ username, kind, onClose }: { username: string; kind: "followers" | "following"; onClose: () => void }) {
  const q = useCursorList<PublicUser & { isFollowing: boolean }>(keys.connections(username, kind), `/users/${username}/${kind}`, { limit: 20 });
  const me = useMe();
  const users = flatten(q.data);
  return (
    <Modal open onClose={onClose} title={kind === "followers" ? "Followers" : "Following"}>
      {q.isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : users.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-soft">{kind === "followers" ? "No followers yet." : "Not following anyone yet."}</p>
      ) : (
        <ul className="space-y-1">
          {users.map((u) => (
            <li key={u._id} className="flex items-center gap-3 py-1.5">
              <Link to={`/u/${u.username}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar user={u} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{displayName(u)}</span>
                  <span className="block truncate text-xs text-ink-soft">@{u.username}</span>
                </span>
              </Link>
              {me && me.username !== u.username && <FollowButton username={u.username} following={u.isFollowing} />}
            </li>
          ))}
        </ul>
      )}
      <LoadMore onVisible={() => void q.fetchNextPage()} loading={q.isFetchingNextPage} hasMore={Boolean(q.hasNextPage)} />
    </Modal>
  );
}

function SeriesList({ username }: { username: string }) {
  const { data, isLoading } = useQuery({ queryKey: keys.profileSeries(username), queryFn: () => api.get<{ items: Series[] }>(`/users/${username}/series`) });
  if (isLoading) return <FeedSkeleton count={2} />;
  if (!data?.items.length) return <EmptyState title="No series yet" />;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {data.items.map((s) => (
        <Link key={s._id} to={`/series/${s._id}`} className="rounded-xl border border-line bg-surface p-4 hover:shadow-md">
          <div className="font-semibold">{s.title}</div>
          {s.description && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{s.description}</p>}
        </Link>
      ))}
    </div>
  );
}

export default function Profile() {
  const { username = "" } = useParams();
  const { data: profile, isLoading, error } = useProfile(username);
  const posts = useCursorList<PostCardType>(keys.profilePosts(username), `/users/${username}/posts`, {}, Boolean(profile));
  const [tab, setTab] = useState<"posts" | "series">("posts");
  const [modal, setModal] = useState<"followers" | "following" | null>(null);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }
  if (error || !profile) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <title>User not found · Klyro</title>
        <EmptyState title={error instanceof ApiError && error.status === 404 ? "This user doesn't exist" : "Couldn't load this profile"} action={<ButtonLink to="/">Back to home</ButtonLink>} />
      </div>
    );
  }

  const list = flatten(posts.data);
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <title>{`${displayName(profile)} (@${profile.username}) · Klyro`}</title>
      <meta name="description" content={profile.bio || `Posts by ${displayName(profile)} on Klyro`} />
      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar user={profile} size="xl" className="h-20 w-20 text-2xl sm:h-24 sm:w-24" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight [overflow-wrap:anywhere]">
                  {displayName(profile)}
                  {profile.role && profile.role !== "user" && <Badge tone="brand">{profile.role === "admin" ? "Admin" : "Moderator"}</Badge>}
                </h1>
                <p className="text-ink-soft">@{profile.username}</p>
              </div>
              {profile.isMe ? (
                <ButtonLink to="/settings" variant="outline" size="sm">
                  <Pencil className="h-4 w-4" /> Edit profile
                </ButtonLink>
              ) : (
                <FollowButton username={profile.username} following={profile.isFollowing} />
              )}
            </div>
            {profile.bio && <p className="mt-3 max-w-2xl whitespace-pre-line [overflow-wrap:anywhere]">{profile.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-soft">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {profile.location}
                </span>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer nofollow" className="flex min-w-0 items-center gap-1 hover:text-ink">
                  <Globe className="h-4 w-4 shrink-0" />
                  <span className="truncate">{profile.website.replace(/^https?:\/\//, "")}</span>
                </a>
              )}
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" /> Joined {formatDate(profile.createdAt)}
              </span>
            </div>
            <div className="mt-4 flex gap-5 text-sm">
              <button onClick={() => setModal("followers")} className="hover:underline">
                <strong>{compact(profile.followersCount)}</strong> <span className="text-ink-soft">followers</span>
              </button>
              <button onClick={() => setModal("following")} className="hover:underline">
                <strong>{compact(profile.followingCount)}</strong> <span className="text-ink-soft">following</span>
              </button>
              <span>
                <strong>{compact(profile.postsCount)}</strong> <span className="text-ink-soft">posts</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <Tabs
        className="mt-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "posts", label: "Posts" },
          { value: "series", label: "Series" },
        ]}
      />
      <div className="mt-5">
        {tab === "series" ? (
          <SeriesList username={profile.username} />
        ) : posts.isLoading ? (
          <FeedSkeleton />
        ) : list.length === 0 ? (
          <EmptyState title="No posts yet" action={profile.isMe ? <ButtonLink to="/write">Write your first post</ButtonLink> : undefined}>
            {profile.isMe ? "Share something you learned recently." : `${displayName(profile)} hasn't published anything yet.`}
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {list.map((p) => (
              <PostCard key={p._id} post={{ ...p, author: p.author ?? profile }} />
            ))}
            <LoadMore onVisible={() => void posts.fetchNextPage()} loading={posts.isFetchingNextPage} hasMore={Boolean(posts.hasNextPage)} />
          </div>
        )}
      </div>
      {modal && <Connections username={profile.username} kind={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
