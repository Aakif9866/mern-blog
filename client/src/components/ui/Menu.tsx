import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import clsx from "clsx";

interface MenuProps {
  trigger: (props: { open: boolean; toggle: () => void; id: string }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  className?: string;
}

/** Popover menu that closes on outside click, Escape, or selecting an item. */
export function Menu({ trigger, children, align = "right", className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o), id })}
      {open && (
        <div
          id={id}
          role="menu"
          className={clsx(
            "absolute z-40 mt-2 min-w-48 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-surface py-1.5 shadow-xl",
            align === "right" ? "right-0" : "left-0",
            className
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

const itemClass = "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-ink hover:bg-muted";

export function MenuItem({ onClick, children, danger, icon }: { onClick: () => void; children: ReactNode; danger?: boolean; icon?: ReactNode }) {
  return (
    <button role="menuitem" onClick={onClick} className={clsx(itemClass, danger && "text-red-600 dark:text-red-400")}>
      {icon}
      {children}
    </button>
  );
}

export function MenuLink({ to, onClick, children, icon }: { to: string; onClick: () => void; children: ReactNode; icon?: ReactNode }) {
  return (
    <Link role="menuitem" to={to} onClick={onClick} className={itemClass}>
      {icon}
      {children}
    </Link>
  );
}

export const MenuDivider = () => <div className="my-1.5 h-px bg-line" role="separator" />;
