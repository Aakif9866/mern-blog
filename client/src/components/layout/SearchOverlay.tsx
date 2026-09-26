import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Hash, Search, X } from "lucide-react";
import { api, qs } from "@/lib/api";
import { useDebounced } from "@/lib/useDebounce";
import { useAppDispatch, useAppSelector } from "@/store";
import { setSearchOpen } from "@/store/uiSlice";
import type { PostCard, PublicUser, Tag } from "@/lib/types";
import { Avatar } from "../ui/Avatar";
import { Spinner } from "../ui/Spinner";
import { displayName } from "@/lib/format";

/** Full-screen on phones, floating palette on desktop. "/" opens it from anywhere. */
export function SearchOverlay() {
  const open = useAppSelector((s) => s.ui.searchOpen);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const dq = useDebounced(q.trim(), 250);
  const close = () => dispatch(setSearchOpen(false));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        dispatch(setSearchOpen(true));
      }
      if (e.key === "Escape") dispatch(setSearchOpen(false));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dispatch]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: ["quick-search", dq],
    queryFn: () => api.get<{ posts: PostCard[]; users: PublicUser[]; tags: Tag[] }>(`/search${qs({ q: dq, type: "all" })}`),
    enabled: open && dq.length > 1,
    staleTime: 60_000,
  });

  if (!open) return null;
  const submit = () => {
    if (!q.trim()) return;
    close();
    navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };
  const empty = data && !data.posts.length && !data.users.length && !data.tags.length;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-center sm:items-start sm:p-4 sm:pt-[12vh]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={close} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Search" className="relative flex h-full w-full flex-col bg-surface sm:h-auto sm:max-h-[70vh] sm:max-w-xl sm:rounded-2xl sm:border sm:border-line sm:shadow-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-center gap-2 border-b border-line px-4"
        >
          <Search className="h-5 w-5 shrink-0 text-ink-soft" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search posts, people and tags"
            className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink-soft/70"
            aria-label="Search"
            enterKeyHint="search"
          />
          {isFetching && <Spinner className="h-4 w-4 text-ink-soft" />}
          <button type="button" onClick={close} className="rounded-lg p-2 text-ink-soft hover:bg-muted" aria-label="Close search">
            <X className="h-5 w-5" />
          </button>
        </form>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {dq.length < 2 && <p className="px-3 py-6 text-center text-sm text-ink-soft">Type at least two characters to search.</p>}
          {empty && <p className="px-3 py-6 text-center text-sm text-ink-soft">No matches for “{dq}”.</p>}
          {data && data.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 px-2 py-2">
              {data.tags.map((t) => (
                <Link key={t._id} to={`/tags/${t.slug}`} onClick={close} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-sm hover:bg-line">
                  <Hash className="h-3.5 w-3.5 text-ink-soft" />
                  {t.slug}
                </Link>
              ))}
            </div>
          )}
          {data?.users.map((u) => (
            <Link key={u._id} to={`/u/${u.username}`} onClick={close} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted">
              <Avatar user={u} size="sm" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{displayName(u)}</div>
                <div className="truncate text-xs text-ink-soft">@{u.username}</div>
              </div>
            </Link>
          ))}
          {data?.posts.map((p) => (
            <Link key={p._id} to={`/post/${p.slug}`} onClick={close} className="block rounded-lg px-3 py-2.5 hover:bg-muted">
              <div className="line-clamp-2 text-sm font-medium">{p.title}</div>
              <div className="truncate text-xs text-ink-soft">by {displayName(p.author)}</div>
            </Link>
          ))}
          {dq.length > 1 && (
            <button onClick={submit} className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-brand-600 hover:bg-muted dark:text-brand-300">
              See all results for “{dq}”
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
