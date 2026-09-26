import clsx from "clsx";
import { NavLink } from "react-router";

interface Tab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** Horizontally scrollable tabs; scrolling stays inside the tab bar on narrow screens. */
export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: Tab<T>[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={clsx("scrollbar-none -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0", className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={clsx(
            "-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
            value === t.value ? "border-brand-600 text-ink" : "border-transparent text-ink-soft hover:text-ink"
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs text-ink-soft">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function LinkTabs({ tabs }: { tabs: { to: string; label: string; end?: boolean }[] }) {
  return (
    <nav className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            clsx("-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium", isActive ? "border-brand-600 text-ink" : "border-transparent text-ink-soft hover:text-ink")
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
