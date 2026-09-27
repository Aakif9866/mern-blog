import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, Check, CloudOff, Eye, ImagePlus, Loader2, PenLine, Plus, Settings2, Sparkles, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { api, ApiError, errorMessage } from "@/lib/api";
import { keys } from "@/api/keys";
import { useConfig } from "@/api/hooks";
import type { Post, Series } from "@/lib/types";
import { useMe } from "@/store";
import { RichEditor } from "@/components/editor/RichEditor";
import { TagInput } from "@/components/editor/TagInput";
import { uploadImage } from "@/components/editor/upload";
import { PostContent } from "@/components/post/PostContent";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { PageSpinner, Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/format";

interface Draft {
  title: string;
  content: string;
  tags: string[];
  coverImage: string;
  series: string | null;
}

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const EMPTY: Draft = { title: "", content: "", tags: [], coverImage: "", series: null };

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function SettingsPanel({ draft, set, postId }: { draft: Draft; set: (p: Partial<Draft>) => void; postId: string | null }) {
  const qc = useQueryClient();
  const config = useConfig();
  const coverRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [newSeries, setNewSeries] = useState("");
  const series = useQuery({ queryKey: keys.mySeries, queryFn: () => api.get<{ items: Series[] }>("/series/mine") });
  const suggest = useMutation({
    mutationFn: () => api.post<{ tags: string[] }>("/posts/ai/suggest-tags", { title: draft.title, content: draft.content }),
    onSuccess: (r) => {
      const merged = [...new Set([...draft.tags, ...r.tags])].slice(0, 5);
      if (merged.length === draft.tags.length) toast("No new tag ideas for this post yet");
      set({ tags: merged });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const createSeries = useMutation({
    mutationFn: () => api.post<Series>("/series", { title: newSeries.trim() }),
    onSuccess: (s) => {
      setNewSeries("");
      void qc.invalidateQueries({ queryKey: keys.mySeries });
      set({ series: s._id });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const onCover = async (file: File) => {
    setUploading(true);
    try {
      set({ coverImage: await uploadImage(file) });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1.5 text-sm font-medium">Cover image</p>
        {draft.coverImage ? (
          <div className="relative overflow-hidden rounded-lg border border-line">
            <img src={draft.coverImage} alt="Cover preview" className="aspect-[2/1] w-full object-cover" />
            <button onClick={() => set({ coverImage: "" })} className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80" aria-label="Remove cover image">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => coverRef.current?.click()} disabled={uploading} className="flex aspect-[2/1] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line text-sm text-ink-soft hover:border-brand-400 hover:text-ink">
            {uploading ? <Spinner /> : <ImagePlus className="h-6 w-6" />}
            {uploading ? "Uploading…" : "Add a cover image"}
          </button>
        )}
        <input
          ref={coverRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onCover(f);
            e.target.value = "";
          }}
        />
      </div>

      <Field label="Tags" hint="Up to 5. Tags help readers find your post.">
        {(id) => (
          <div className="space-y-2">
            <TagInput id={id} value={draft.tags} onChange={(tags) => set({ tags })} />
            <Button variant="outline" size="sm" onClick={() => suggest.mutate()} loading={suggest.isPending} disabled={draft.content.length < 50 || draft.tags.length >= 5}>
              <Sparkles className="h-4 w-4" />
              Suggest tags{config.data?.aiEnabled ? " with AI" : ""}
            </Button>
          </div>
        )}
      </Field>

      <Field label="Series" hint="Group related posts into a numbered series.">
        {(id) => (
          <div className="space-y-2">
            <select id={id} value={draft.series ?? ""} onChange={(e) => set({ series: e.target.value || null })} className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-base sm:h-10 sm:text-sm">
              <option value="">Not part of a series</option>
              {series.data?.items.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.title}
                </option>
              ))}
            </select>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (newSeries.trim()) createSeries.mutate();
              }}
            >
              <Input value={newSeries} onChange={(e) => setNewSeries(e.target.value)} placeholder="New series name" maxLength={120} aria-label="New series name" />
              <Button type="submit" variant="outline" loading={createSeries.isPending} aria-label="Create series">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}
      </Field>
      {!postId && <p className="text-xs text-ink-soft">Your draft is saved automatically once you start writing.</p>}
    </div>
  );
}

function SaveIndicator({ state, published }: { state: SaveState; published: boolean }) {
  const map: Record<SaveState, { icon: ReactNode; text: string }> = {
    idle: { icon: null, text: published ? "Published" : "Draft" },
    dirty: { icon: null, text: published ? "Unsaved changes" : "Editing…" },
    saving: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: "Saving…" },
    saved: { icon: <Check className="h-3.5 w-3.5" />, text: "Saved" },
    error: { icon: <CloudOff className="h-3.5 w-3.5" />, text: "Not saved" },
  };
  const m = map[state];
  return (
    <span className={clsx("flex items-center gap-1 text-xs", state === "error" ? "text-red-600" : "text-ink-soft")} aria-live="polite">
      {m.icon}
      {m.text}
    </span>
  );
}

/**
 * Loads an existing post, then mounts the editor with it. A draft created in
 * this session keeps the same editor instance when its URL gains the new id.
 */
/** Drafts created during this page load. History state alone isn't enough: it survives reloads. */
const liveSessions = new Set<string>();

export default function WriteRoute() {
  const { id } = useParams();
  const location = useLocation();
  const marked = (location.state as { session?: string } | null)?.session;
  const createdHere = marked && liveSessions.has(marked) ? marked : undefined;
  const sessionKey = createdHere ?? id ?? `new-${location.key}`;
  const existing = useQuery({ queryKey: keys.postEdit(id ?? ""), queryFn: () => api.get<Post>(`/posts/${id}/edit`), enabled: Boolean(id) && !createdHere, retry: false, gcTime: 0 });

  if (id && !createdHere) {
    if (existing.isError) {
      return (
        <div className="mx-auto max-w-xl px-4 py-16">
          <EmptyState title={existing.error instanceof ApiError && existing.error.status === 403 ? "You can't edit this post" : "Post not found"} action={<Link to="/dashboard" className="font-medium text-brand-600">Go to your posts</Link>} />
        </div>
      );
    }
    if (!existing.data) return <PageSpinner />;
  }
  return <Write key={sessionKey} sessionKey={sessionKey} initial={createdHere ? undefined : existing.data} />;
}

function Write({ sessionKey, initial }: { sessionKey: string; initial?: Post }) {
  const me = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [postId, setPostId] = useState<string | null>(initial?._id ?? null);
  const [draft, setDraft] = useState<Draft>(() =>
    initial
      ? { title: initial.title, content: initial.content, tags: initial.tags, coverImage: initial.coverImage, series: initial.series && typeof initial.series === "object" ? initial.series._id : (initial.series as string | null) }
      : EMPTY
  );
  const [status, setStatus] = useState<Post["status"]>(initial?.status ?? "draft");
  const [scheduledFor, setScheduledFor] = useState<string | null>(initial?.scheduledFor ?? null);
  const [slug, setSlug] = useState<string | null>(initial?.slug ?? null);
  const [save, setSave] = useState<SaveState>("idle");
  const [minDate] = useState(() => toLocalInput(new Date(Date.now() + 5 * 60_000)));
  const [preview, setPreview] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [mode, setMode] = useState<"now" | "later">("now");
  const creating = useRef<Promise<string> | null>(null);
  const dirtyRef = useRef(false);
  const published = status === "published";

  const ensurePost = useCallback(async (): Promise<string> => {
    if (postId) return postId;
    creating.current ??= api.post<Post>("/posts", {}).then((p) => {
      liveSessions.add(sessionKey);
      setPostId(p._id);
      setSlug(p.slug);
      navigate(`/write/${p._id}`, { replace: true, state: { session: sessionKey } });
      return p._id;
    });
    return creating.current;
  }, [postId, navigate, sessionKey]);

  const persist = useCallback(
    async (d: Draft) => {
      setSave("saving");
      try {
        const id = await ensurePost();
        const p = await api.patch<Post>(`/posts/${id}`, { title: d.title, content: d.content, tags: d.tags, coverImage: d.coverImage, series: d.series });
        setSlug(p.slug);
        dirtyRef.current = false;
        setSave("saved");
        return p;
      } catch (e) {
        setSave("error");
        toast.error(errorMessage(e, "Couldn't save your changes"));
        throw e;
      }
    },
    [ensurePost]
  );

  // Drafts autosave 1.5s after the last change. Published posts save explicitly.
  useEffect(() => {
    if (save !== "dirty" || published) return;
    const t = setTimeout(() => void persist(draft).catch(() => undefined), 1500);
    return () => clearTimeout(t);
  }, [draft, save, published, persist]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const set = useCallback((patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    dirtyRef.current = true;
    setSave("dirty");
  }, []);

  const publish = useMutation({
    mutationFn: async () => {
      const saved = await persist(draft);
      const body = mode === "later" && scheduleAt ? { scheduledFor: new Date(scheduleAt).toISOString() } : {};
      return api.post<Post>(`/posts/${saved._id}/publish`, body);
    },
    onSuccess: (p) => {
      setPublishOpen(false);
      void qc.invalidateQueries({ queryKey: ["feed"] });
      void qc.invalidateQueries({ queryKey: ["my-posts"] });
      if (p.status === "scheduled") {
        toast.success(`Scheduled for ${formatDateTime(p.scheduledFor)}`);
        setStatus("scheduled");
        setScheduledFor(p.scheduledFor);
      } else {
        toast.success("Your post is live 🎉");
        navigate(`/post/${p.slug}`);
      }
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const unschedule = useMutation({
    mutationFn: () => api.post<Post>(`/posts/${postId}/unschedule`),
    onSuccess: () => {
      setStatus("draft");
      setScheduledFor(null);
      toast.success("Moved back to drafts");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const updatePublished = async () => {
    try {
      const p = await persist(draft);
      void qc.invalidateQueries({ queryKey: keys.post(p.slug) });
      toast.success("Post updated");
      navigate(`/post/${p.slug}`);
    } catch {
      /* toast already shown */
    }
  };

  if (me && ((!me.emailVerified && !me.isGuest) || me.status !== "active")) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState icon={<PenLine className="h-5 w-5" />} title={me.status !== "active" ? "Writing is paused on your account" : "Verify your email to start writing"}>
          {me.status !== "active" ? "You can still read while your account is suspended." : "We sent a link to your inbox. You can resend it from the banner above."}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4">
      <title>{draft.title ? `Editing “${draft.title}” · Klyro` : "Write · Klyro"}</title>
      <div className="sticky top-14 z-20 -mx-4 flex items-center gap-2 border-b border-line bg-page/90 px-4 py-2.5 backdrop-blur sm:top-16">
        <button onClick={() => navigate(-1)} className="rounded-lg p-2 text-ink-soft hover:bg-muted" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <SaveIndicator state={save} published={published} />
        {status === "scheduled" && <span className="hidden text-xs text-amber-600 sm:inline">· Scheduled {formatDateTime(scheduledFor)}</span>}
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setPreview((p) => !p)} aria-pressed={preview}>
            {preview ? <PenLine className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">{preview ? "Edit" : "Preview"}</span>
          </Button>
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSettingsOpen(true)} aria-label="Post settings">
            <Settings2 className="h-4 w-4" />
          </Button>
          {published ? (
            <Button size="sm" onClick={updatePublished} loading={save === "saving"} disabled={save !== "dirty" && save !== "error"}>
              Update
            </Button>
          ) : status === "scheduled" ? (
            <Button size="sm" variant="outline" onClick={() => unschedule.mutate()} loading={unschedule.isPending}>
              Unschedule
            </Button>
          ) : me?.isGuest ? (
            <ButtonLink to="/keep-account" size="sm">
              Sign up to publish
            </ButtonLink>
          ) : (
            <Button size="sm" onClick={() => setPublishOpen(true)} disabled={!draft.title.trim() || draft.content.length < 20}>
              Publish
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="mx-auto w-full min-w-0 max-w-3xl">
          {preview ? (
            <div>
              {draft.coverImage && <img src={draft.coverImage} alt="" className="mb-6 aspect-[2/1] w-full rounded-xl object-cover" />}
              <h1 className="text-3xl font-extrabold tracking-tight [overflow-wrap:anywhere] sm:text-4xl">{draft.title || "Untitled"}</h1>
              <div className="mt-6">{draft.content ? <PostContent html={draft.content} /> : <p className="text-ink-soft">Nothing to preview yet.</p>}</div>
            </div>
          ) : (
            <>
              <textarea
                value={draft.title}
                onChange={(e) => set({ title: e.target.value.replace(/\n/g, "") })}
                placeholder="Post title"
                maxLength={200}
                rows={1}
                aria-label="Post title"
                className="field-sizing-content w-full resize-none bg-transparent text-3xl font-extrabold leading-tight tracking-tight outline-none placeholder:text-ink-soft/50 sm:text-4xl"
              />
              <div className="mt-4">
                <RichEditor
                  content={draft.content}
                  onChange={(content) => set({ content })}
                  toolbarSlot={(toolbar) => <div className="sticky top-[6.75rem] z-10 -mx-1 mb-4 rounded-lg border border-line bg-surface px-1 py-1 shadow-sm sm:top-[7.25rem]">{toolbar}</div>}
                />
              </div>
            </>
          )}
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-36 rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-4 font-semibold">Post settings</h2>
            <SettingsPanel draft={draft} set={set} postId={postId} />
          </div>
        </aside>
      </div>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Post settings">
        <SettingsPanel draft={draft} set={set} postId={postId} />
      </Modal>

      <Modal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        title="Publish your post"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPublishOpen(false)}>
              Keep editing
            </Button>
            <Button onClick={() => publish.mutate()} loading={publish.isPending} disabled={mode === "later" && !scheduleAt}>
              {mode === "later" ? <CalendarClock className="h-4 w-4" /> : null}
              {mode === "later" ? "Schedule" : "Publish now"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {draft.tags.length === 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Tip: add a few tags in post settings so readers can find this post.
            </p>
          )}
          <div role="radiogroup" aria-label="When to publish" className="grid grid-cols-2 gap-2">
            {(["now", "later"] as const).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={clsx("rounded-lg border px-3 py-3 text-sm font-medium", mode === m ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "border-line hover:bg-muted")}
              >
                {m === "now" ? "Right now" : "Schedule for later"}
              </button>
            ))}
          </div>
          {mode === "later" && (
            <Field label="Publish on" hint={`Your local time (${Intl.DateTimeFormat().resolvedOptions().timeZone}).`}>
              {(id) => <Input id={id} type="datetime-local" min={minDate} value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />}
            </Field>
          )}
        </div>
      </Modal>

      {postId && status === "draft" && slug && (
        <div className="pb-8 text-center">
          <DeleteDraft postId={postId} />
        </div>
      )}
    </div>
  );
}

function DeleteDraft({ postId }: { postId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const del = useMutation({
    mutationFn: () => api.delete(`/posts/${postId}`),
    onSuccess: () => {
      toast.success("Draft deleted");
      void qc.invalidateQueries({ queryKey: ["my-posts"] });
      navigate("/dashboard");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-red-600">
        <Trash2 className="h-4 w-4" /> Delete draft
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this draft?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => del.mutate()} loading={del.isPending}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">This can't be undone.</p>
      </Modal>
    </>
  );
}
