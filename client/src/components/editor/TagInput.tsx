import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

export const MAX_TAGS = 5;
export const normalizeTag = (t: string) => t.toLowerCase().replace(/^#/, "").replace(/[^a-z0-9]/g, "").slice(0, 30);

/** Chips input for up to five tags. Enter, comma or space adds a tag. */
export function TagInput({ value, onChange, id }: { value: string[]; onChange: (tags: string[]) => void; id?: string }) {
  const [text, setText] = useState("");
  const add = (raw: string) => {
    const tag = normalizeTag(raw);
    if (tag && !value.includes(tag) && value.length < MAX_TAGS) onChange([...value, tag]);
    setText("");
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", " ", "Tab"].includes(e.key) && text.trim()) {
      e.preventDefault();
      add(text);
    } else if (e.key === "Backspace" && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-2.5 pr-1 text-sm font-medium text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
          #{t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="-my-1 flex h-8 w-8 items-center justify-center rounded-full hover:bg-brand-100 dark:hover:bg-brand-800" aria-label={`Remove tag ${t}`}>
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      {value.length < MAX_TAGS && (
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => text.trim() && add(text)}
          placeholder={value.length ? "Add another…" : "Add up to 5 tags"}
          className="h-8 min-w-24 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-ink-soft/70 sm:text-sm"
          aria-label="Add tag"
        />
      )}
    </div>
  );
}
