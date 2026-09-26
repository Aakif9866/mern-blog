import { useRef, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { api, qs } from "@/lib/api";
import { useDebounced } from "@/lib/useDebounce";
import type { PublicUser } from "@/lib/types";
import { Avatar } from "../ui/Avatar";
import { Textarea } from "../ui/Input";
import { displayName } from "@/lib/format";

/** Textarea that suggests usernames after typing "@". */
export function MentionTextarea({ value, onChange, onSubmit, ...rest }: { value: string; onChange: (v: string) => void; onSubmit?: () => void; placeholder?: string; rows?: number; autoFocus?: boolean; "aria-label"?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const dq = useDebounced(query, 200);
  const { data } = useQuery({
    queryKey: ["mention", dq],
    queryFn: () => api.get<{ items: PublicUser[] }>(`/search${qs({ q: dq ?? "", type: "users", limit: 5 })}`),
    enabled: Boolean(dq && dq.length >= 1),
    staleTime: 60_000,
  });
  const suggestions = query ? (data?.items ?? []) : [];

  const detect = (text: string, caret: number) => {
    const m = text.slice(0, caret).match(/(?:^|\s)@([a-z0-9_]{1,30})$/i);
    setQuery(m?.[1] ?? null);
    setActive(0);
  };

  const pick = (u: PublicUser) => {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart;
    const before = value.slice(0, caret).replace(/@([a-z0-9_]*)$/i, `@${u.username} `);
    const next = before + value.slice(caret);
    onChange(next);
    setQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(before.length, before.length);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (a + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const u = suggestions[active];
        if (u) pick(u);
        return;
      }
      if (e.key === "Escape") return setQuery(null);
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmit?.();
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        value={value}
        maxLength={2000}
        onChange={(e) => {
          onChange(e.target.value);
          detect(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        {...rest}
      />
      {suggestions.length > 0 && (
        <ul role="listbox" className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg sm:right-auto sm:w-72">
          {suggestions.map((u, i) => (
            <li key={u._id} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(u)} className={clsx("flex w-full items-center gap-2 px-3 py-2 text-left text-sm", i === active ? "bg-muted" : "hover:bg-muted")}>
                <Avatar user={u} size="xs" />
                <span className="truncate font-medium">{displayName(u)}</span>
                <span className="truncate text-ink-soft">@{u.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
