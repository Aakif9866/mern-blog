import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, FolderPlus, Pencil, Trash2 } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { flatten, useCursorList } from "@/api/hooks";
import { keys } from "@/api/keys";
import { api, errorMessage } from "@/lib/api";
import type { Collection, PostCard as PostCardType } from "@/lib/types";
import { PostCard } from "@/components/post/PostCard";
import { FeedSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, LoadMore } from "@/components/ui/misc";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";

export default function Bookmarks() {
  const qc = useQueryClient();
  const [list, setList] = useState<string>("all");
  const [editing, setEditing] = useState<Collection | "new" | null>(null);
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState<Collection | null>(null);
  const cols = useQuery({ queryKey: keys.collections, queryFn: () => api.get<{ total: number; unsorted: number; collections: Collection[] }>("/bookmarks/collections") });
  const posts = useCursorList<PostCardType>(keys.bookmarks(list), "/bookmarks", { list: list === "all" ? undefined : list });
  const items = flatten(posts.data);

  const save = useMutation({
    mutationFn: () => (editing === "new" ? api.post("/bookmarks/collections", { name }) : api.patch(`/bookmarks/collections/${(editing as Collection)._id}`, { name })),
    onSuccess: () => {
      setEditing(null);
      void qc.invalidateQueries({ queryKey: keys.collections });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/bookmarks/collections/${id}`),
    onSuccess: () => {
      setConfirm(null);
      setList("all");
      void qc.invalidateQueries({ queryKey: keys.collections });
      void qc.invalidateQueries({ queryKey: ["bookmarks"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const chips = [
    { id: "all", label: "All", count: cols.data?.total },
    { id: "none", label: "Unsorted", count: cols.data?.unsorted },
    ...(cols.data?.collections.map((c) => ({ id: c._id, label: c.name, count: c.count })) ?? []),
  ];
  const current = cols.data?.collections.find((c) => c._id === list);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <title>Bookmarks · Klyro</title>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Bookmarks</h1>
        <Button variant="outline" size="sm" onClick={() => (setName(""), setEditing("new"))}>
          <FolderPlus className="h-4 w-4" /> New collection
        </Button>
      </div>
      <div className="scrollbar-none -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1">
        {chips.map((c) => (
          <button
            key={c.id}
            onClick={() => setList(c.id)}
            aria-pressed={list === c.id}
            className={clsx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium", list === c.id ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "border-line bg-surface text-ink-soft hover:text-ink")}
          >
            {c.label}
            {c.count !== undefined && <span className="ml-1.5 text-xs opacity-70">{c.count}</span>}
          </button>
        ))}
      </div>
      {current && (
        <div className="mt-3 flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => (setName(current.name), setEditing(current))}>
            <Pencil className="h-4 w-4" /> Rename
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirm(current)}>
            <Trash2 className="h-4 w-4" /> Delete collection
          </Button>
        </div>
      )}
      <div className="mt-5">
        {posts.isLoading ? (
          <FeedSkeleton />
        ) : items.length === 0 ? (
          <EmptyState icon={<Bookmark className="h-5 w-5" />} title={list === "all" ? "Nothing saved yet" : "This collection is empty"} action={list === "all" ? <ButtonLink to="/">Find something to read</ButtonLink> : undefined}>
            Tap the bookmark icon on any post to save it for later.
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {items.map((p) => (
              <PostCard key={p._id} post={p} />
            ))}
            <LoadMore onVisible={() => void posts.fetchNextPage()} loading={posts.isFetchingNextPage} hasMore={Boolean(posts.hasNextPage)} />
          </div>
        )}
      </div>
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New collection" : "Rename collection"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!name.trim()}>Save</Button>
          </>
        }
      >
        <Field label="Name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} onKeyDown={(e) => e.key === "Enter" && name.trim() && save.mutate()} />}</Field>
      </Modal>
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title="Delete collection?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => confirm && remove.mutate(confirm._id)} loading={remove.isPending}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">Posts in “{confirm?.name}” stay bookmarked and move to Unsorted.</p>
      </Modal>
    </div>
  );
}
