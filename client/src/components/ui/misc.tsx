import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router";
import clsx from "clsx";
import { Spinner } from "./Spinner";

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      {icon && <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-ink-soft">{icon}</div>}
      <h3 className="font-semibold">{title}</h3>
      {children && <div className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">{children}</div>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function TagChip({ tag, size = "sm", className }: { tag: string; size?: "sm" | "md"; className?: string }) {
  return (
    <Link
      to={`/tags/${tag}`}
      className={clsx(
        "inline-flex items-center rounded-full bg-muted font-medium text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/40 dark:hover:text-brand-200",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
        className
      )}
    >
      <span className="text-ink-soft/60">#</span>
      {tag}
    </Link>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brand" | "green" | "amber" | "red" }) {
  const tones = {
    neutral: "bg-muted text-ink-soft",
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    red: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
  return <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

/** Calls onVisible when scrolled into view; drives infinite scrolling. */
export function LoadMore({ onVisible, loading, hasMore }: { onVisible: () => void; loading: boolean; hasMore: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && !loading && onVisible(), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [onVisible, loading, hasMore]);
  if (!hasMore) return null;
  return (
    <div ref={ref} className="flex justify-center py-6 text-ink-soft">
      {loading ? (
        <Spinner />
      ) : (
        <button onClick={onVisible} className="text-sm font-medium hover:text-ink">
          Load more
        </button>
      )}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("rounded-xl border border-line bg-surface", className)}>{children}</div>;
}
