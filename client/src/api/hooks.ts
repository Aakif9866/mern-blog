import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, errorMessage, qs } from "@/lib/api";
import type {
  CommentItem,
  CommentPage,
  Me,
  NotificationItem,
  Page,
  Post,
  PostCard,
  Profile,
  PublicUser,
  Series,
  Tag,
  ViewerState,
} from "@/lib/types";
import { keys } from "./keys";
import { useAppDispatch } from "@/store";
import { userUpdated } from "@/store/authSlice";

export const PAGE_SIZE = 10;

/** Infinite cursor-paginated list. */
export function useCursorList<T>(key: QueryKey, path: string, params: Record<string, string | number | undefined> = {}, enabled = true) {
  return useInfiniteQuery({
    queryKey: [...key, params],
    queryFn: ({ pageParam, signal }) => api.get<Page<T>>(`${path}${qs({ ...params, limit: params.limit ?? PAGE_SIZE, cursor: pageParam ?? undefined })}`, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
  });
}

export const flatten = <T,>(data: InfiniteData<Page<T>> | undefined): T[] => data?.pages.flatMap((p) => p.items) ?? [];

// ---- Config ----
export function useConfig() {
  return useQuery({ queryKey: keys.config, queryFn: () => api.get<{ googleClientId: string | null; aiEnabled: boolean }>("/auth/config"), staleTime: Infinity });
}

// ---- Posts ----
export function usePost(slug: string) {
  return useQuery({ queryKey: keys.post(slug), queryFn: ({ signal }) => api.get<{ post: Post; viewer: ViewerState }>(`/posts/slug/${encodeURIComponent(slug)}`, signal) });
}

export function useRelated(postId: string | undefined) {
  return useQuery({ queryKey: keys.related(postId ?? ""), queryFn: () => api.get<{ items: PostCard[] }>(`/posts/${postId}/related`), enabled: Boolean(postId), staleTime: 5 * 60_000 });
}

type PostData = { post: Post; viewer: ViewerState };

/** Like/Helpful toggle with an optimistic count update, rolled back on failure. */
export function useReaction(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, type }: { postId: string; type: "like" | "helpful" }) =>
      api.post<{ active: boolean; likesCount: number; helpfulCount: number }>(`/posts/${postId}/reactions`, { type }),
    onMutate: async ({ type }) => {
      await qc.cancelQueries({ queryKey: keys.post(slug) });
      const prev = qc.getQueryData<PostData>(keys.post(slug));
      if (prev) {
        const flag = type === "like" ? "liked" : "helpful";
        const count = type === "like" ? "likesCount" : "helpfulCount";
        const on = !prev.viewer[flag];
        qc.setQueryData<PostData>(keys.post(slug), {
          post: { ...prev.post, [count]: prev.post[count] + (on ? 1 : -1) },
          viewer: { ...prev.viewer, [flag]: on },
        });
      }
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.post(slug), ctx.prev);
      toast.error(errorMessage(err));
    },
    onSuccess: (res) => {
      qc.setQueryData<PostData>(keys.post(slug), (d) => (d ? { ...d, post: { ...d.post, likesCount: res.likesCount, helpfulCount: res.helpfulCount } } : d));
    },
  });
}

export function useBookmark(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, on, list }: { postId: string; on: boolean; list?: string | null }) =>
      on ? api.put(`/posts/${postId}/bookmark`, { list: list ?? null }) : api.delete(`/posts/${postId}/bookmark`),
    onMutate: async ({ on, list }) => {
      await qc.cancelQueries({ queryKey: keys.post(slug) });
      const prev = qc.getQueryData<PostData>(keys.post(slug));
      if (prev) {
        const delta = on === prev.viewer.bookmarked ? 0 : on ? 1 : -1;
        qc.setQueryData<PostData>(keys.post(slug), {
          post: { ...prev.post, bookmarksCount: prev.post.bookmarksCount + delta },
          viewer: { ...prev.viewer, bookmarked: on, bookmarkList: on ? (list ?? null) : null },
        });
      }
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.post(slug), ctx.prev);
      toast.error(errorMessage(err));
    },
    onSuccess: (_d, { on }) => {
      toast.success(on ? "Saved to your bookmarks" : "Removed from bookmarks");
      void qc.invalidateQueries({ queryKey: ["bookmarks"] });
      void qc.invalidateQueries({ queryKey: keys.collections });
    },
  });
}

// ---- Follow ----
export function useFollow(username: string) {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: (follow: boolean) => (follow ? api.post(`/users/${username}/follow`) : api.delete(`/users/${username}/follow`)),
    onMutate: async (follow) => {
      await qc.cancelQueries({ queryKey: keys.profile(username) });
      const prev = qc.getQueryData<Profile>(keys.profile(username));
      if (prev) qc.setQueryData<Profile>(keys.profile(username), { ...prev, isFollowing: follow, followersCount: prev.followersCount + (follow ? 1 : -1) });
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.profile(username), ctx.prev);
      toast.error(errorMessage(err));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["post"] });
      void qc.invalidateQueries({ queryKey: keys.feed("following") });
      void qc.invalidateQueries({ queryKey: ["connections"] });
      void qc.invalidateQueries({ queryKey: keys.suggestions });
      void api.get<{ user: Me }>("/auth/me").then((r) => dispatch(userUpdated(r.user))).catch(() => undefined);
    },
  });
}

export function useTagFollow(tag: string) {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: (follow: boolean) => (follow ? api.post(`/tags/${tag}/follow`) : api.delete(`/tags/${tag}/follow`)),
    onMutate: async (follow) => {
      const prev = qc.getQueryData<Tag>(keys.tag(tag));
      if (prev) qc.setQueryData<Tag>(keys.tag(tag), { ...prev, isFollowing: follow, followersCount: prev.followersCount + (follow ? 1 : -1) });
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.tag(tag), ctx.prev);
      toast.error(errorMessage(err));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.feed("following") });
      void api.get<{ user: Me }>("/auth/me").then((r) => dispatch(userUpdated(r.user))).catch(() => undefined);
    },
  });
}

// ---- Comments ----
export function useComments(postId: string | undefined) {
  return useInfiniteQuery({
    queryKey: keys.comments(postId ?? ""),
    queryFn: ({ pageParam }) => api.get<CommentPage>(`/comments/post/${postId}${qs({ cursor: pageParam ?? undefined, limit: 15 })}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: Boolean(postId),
  });
}

export function useCommentLike(postId: string) {
  const qc = useQueryClient();
  const key = keys.comments(postId);
  const patch = (id: string, fn: (c: CommentItem) => CommentItem) =>
    qc.setQueryData<InfiniteData<CommentPage>>(key, (d) =>
      d
        ? {
            ...d,
            pages: d.pages.map((p) => ({ ...p, items: p.items.map((c) => (c._id === id ? fn(c) : c)), replies: p.replies.map((c) => (c._id === id ? fn(c) : c)) })),
          }
        : d
    );
  return useMutation({
    mutationFn: (id: string) => api.post<{ liked: boolean; likesCount: number }>(`/comments/${id}/like`),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      patch(id, (c) => ({ ...c, liked: !c.liked, likesCount: c.likesCount + (c.liked ? -1 : 1) }));
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error(errorMessage(err));
    },
    onSuccess: (res, id) => patch(id, (c) => ({ ...c, liked: res.liked, likesCount: res.likesCount })),
  });
}

// ---- Profiles, tags ----
export function useProfile(username: string) {
  return useQuery({ queryKey: keys.profile(username), queryFn: ({ signal }) => api.get<Profile>(`/users/${username}`, signal) });
}

export function useSuggestions(enabled = true) {
  return useQuery({ queryKey: keys.suggestions, queryFn: () => api.get<{ items: PublicUser[] }>("/users/suggestions"), enabled, staleTime: 5 * 60_000 });
}

export function useTrendingTags() {
  return useQuery({ queryKey: keys.trendingTags, queryFn: () => api.get<{ items: Tag[] }>("/tags/trending"), staleTime: 5 * 60_000 });
}

export function useSeries(id: string) {
  return useQuery({ queryKey: keys.series(id), queryFn: () => api.get<Series>(`/series/${id}`) });
}

// ---- Notifications ----
export function useUnreadCount(enabled: boolean) {
  return useQuery({ queryKey: keys.unread, queryFn: () => api.get<{ count: number }>("/notifications/unread-count"), enabled, refetchInterval: 120_000 });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => api.post("/notifications/read", { ids }),
    onMutate: async (ids) => {
      qc.setQueriesData<InfiniteData<Page<NotificationItem>>>({ queryKey: ["notifications"] }, (d) =>
        d && "pages" in d ? { ...d, pages: d.pages.map((p) => ({ ...p, items: p.items.map((n) => (!ids || ids.includes(n._id) ? { ...n, read: true } : n)) })) } : d
      );
      qc.setQueryData<{ count: number }>(keys.unread, (d) => (d ? { count: ids ? Math.max(0, d.count - ids.length) : 0 } : d));
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: keys.unread }),
  });
}
