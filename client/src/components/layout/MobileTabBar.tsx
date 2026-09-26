import { NavLink, useLocation } from "react-router";
import { Bell, Home, PenSquare, Search, User } from "lucide-react";
import clsx from "clsx";
import { useAppDispatch, useMe } from "@/store";
import { setSearchOpen } from "@/store/uiSlice";
import { useUnreadCount } from "@/api/hooks";

const item = "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium";

/** Bottom navigation for signed-in users on phones, so key actions stay within thumb reach. */
export function MobileTabBar() {
  const me = useMe();
  const dispatch = useAppDispatch();
  const { data } = useUnreadCount(Boolean(me));
  const { pathname } = useLocation();
  // The editor needs the whole screen (and room for the keyboard).
  if (!me || pathname.startsWith("/write")) return null;
  const cls = ({ isActive }: { isActive: boolean }) => clsx(item, isActive ? "text-brand-600 dark:text-brand-300" : "text-ink-soft");
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md sm:hidden" aria-label="Primary">
      <div className="flex">
        <NavLink to="/" end className={cls}>
          <Home className="h-5 w-5" />
          Home
        </NavLink>
        <button onClick={() => dispatch(setSearchOpen(true))} className={clsx(item, "text-ink-soft")}>
          <Search className="h-5 w-5" />
          Search
        </button>
        <NavLink to="/write" className={cls}>
          <PenSquare className="h-5 w-5" />
          Write
        </NavLink>
        <NavLink to="/notifications" className={cls}>
          <span className="relative">
            <Bell className="h-5 w-5" />
            {(data?.count ?? 0) > 0 && <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-surface" />}
          </span>
          Alerts
        </NavLink>
        <NavLink to={`/u/${me.username}`} className={cls}>
          <User className="h-5 w-5" />
          Profile
        </NavLink>
      </div>
    </nav>
  );
}
