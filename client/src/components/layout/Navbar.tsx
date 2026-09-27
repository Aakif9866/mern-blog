import { useQueryClient } from "@tanstack/react-query";
import { Link, NavLink, useNavigate } from "react-router";
import { Bell, Bookmark, LayoutDashboard, LogOut, Moon, PenSquare, Search, Settings, Shield, Sun, User, UserPlus, Monitor } from "lucide-react";
import clsx from "clsx";
import { Logo } from "../ui/Logo";
import { Avatar } from "../ui/Avatar";
import { Menu, MenuDivider, MenuItem, MenuLink } from "../ui/Menu";
import { ButtonLink } from "../ui/Button";
import { useAppDispatch, useAppSelector, useMe } from "@/store";
import { setSearchOpen, setTheme, type ThemePref } from "@/store/uiSlice";
import { useUnreadCount } from "@/api/hooks";
import { logout } from "@/lib/session";
import { displayName } from "@/lib/format";

export function ThemeMenuItems({ close }: { close: () => void }) {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  const opts: { value: ThemePref; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  return (
    <div className="flex gap-1 px-2 py-1.5">
      {opts.map((o) => (
        <button
          key={o.value}
          onClick={() => {
            dispatch(setTheme(o.value));
            close();
          }}
          className={clsx("flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-xs", theme === o.value ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "text-ink-soft hover:bg-muted")}
          aria-pressed={theme === o.value}
        >
          <o.icon className="h-4 w-4" />
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ThemeToggle() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return (
    <button onClick={() => dispatch(setTheme(isDark ? "light" : "dark"))} className="rounded-lg p-2.5 text-ink-soft hover:bg-muted hover:text-ink" aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export function NotificationBell({ className }: { className?: string }) {
  const me = useMe();
  const { data } = useUnreadCount(Boolean(me));
  const count = data?.count ?? 0;
  return (
    <NavLink to="/notifications" className={clsx("relative flex rounded-lg p-2.5 text-ink-soft hover:bg-muted hover:text-ink", className)} aria-label={count ? `Notifications, ${count} unread` : "Notifications"}>
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{count > 99 ? "99+" : count}</span>
      )}
    </NavLink>
  );
}

function UserMenu() {
  const me = useMe()!;
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isMod = me.role === "moderator" || me.role === "admin";
  return (
    <Menu
      trigger={({ toggle, open, id }) => (
        <button onClick={toggle} aria-expanded={open} aria-controls={id} aria-label="Account menu" className="rounded-full p-0.5 hover:ring-2 hover:ring-line">
          <Avatar user={me} size="sm" />
        </button>
      )}
    >
      {(close) => (
        <>
          <Link to={`/u/${me.username}`} onClick={close} className="block px-3.5 py-2.5 hover:bg-muted">
            <div className="truncate font-semibold">{displayName(me)}</div>
            <div className="truncate text-sm text-ink-soft">{me.isGuest ? "Guest session" : `@${me.username}`}</div>
          </Link>
          <MenuDivider />
          {me.isGuest && (
            <MenuLink to="/keep-account" onClick={close} icon={<UserPlus className="h-4 w-4" />}>
              Create account
            </MenuLink>
          )}
          <MenuLink to="/dashboard" onClick={close} icon={<LayoutDashboard className="h-4 w-4" />}>
            My posts
          </MenuLink>
          <MenuLink to="/bookmarks" onClick={close} icon={<Bookmark className="h-4 w-4" />}>
            Bookmarks
          </MenuLink>
          <MenuLink to={`/u/${me.username}`} onClick={close} icon={<User className="h-4 w-4" />}>
            Profile
          </MenuLink>
          <MenuLink to="/settings" onClick={close} icon={<Settings className="h-4 w-4" />}>
            Settings
          </MenuLink>
          {isMod && (
            <MenuLink to="/mod" onClick={close} icon={<Shield className="h-4 w-4" />}>
              Moderation
            </MenuLink>
          )}
          <MenuDivider />
          <ThemeMenuItems close={close} />
          <MenuDivider />
          <MenuItem
            icon={<LogOut className="h-4 w-4" />}
            onClick={async () => {
              close();
              await logout(dispatch, qc);
              navigate("/");
            }}
          >
            {me.isGuest ? "End guest session" : "Sign out"}
          </MenuItem>
        </>
      )}
    </Menu>
  );
}

export function Navbar() {
  const me = useMe();
  const status = useAppSelector((s) => s.auth.status);
  const dispatch = useAppDispatch();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:h-16 sm:gap-4">
        <Logo />
        <button
          onClick={() => dispatch(setSearchOpen(true))}
          className="ml-2 hidden h-10 w-full max-w-sm items-center gap-2 rounded-lg border border-line bg-muted/60 px-3 text-sm text-ink-soft hover:border-ink-soft/40 md:flex"
        >
          <Search className="h-4 w-4" />
          Search Klyro…
          <kbd className="ml-auto rounded border border-line px-1.5 text-[11px] font-sans">/</kbd>
        </button>
        <nav className="ml-auto flex items-center gap-1">
          <button onClick={() => dispatch(setSearchOpen(true))} className="rounded-lg p-2.5 text-ink-soft hover:bg-muted hover:text-ink md:hidden" aria-label="Search">
            <Search className="h-5 w-5" />
          </button>
          {status === "loading" ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : me ? (
            <>
              <span className="hidden sm:block">
                <ButtonLink to="/write" size="sm">
                  <PenSquare className="h-4 w-4" />
                  Write
                </ButtonLink>
              </span>
              <span className="hidden sm:block">
                <NotificationBell />
              </span>
              <UserMenu />
            </>
          ) : (
            <>
              <ThemeToggle />
              <span className="hidden sm:block">
                <ButtonLink to="/sign-in" variant="ghost" size="sm">
                  Sign in
                </ButtonLink>
              </span>
              <ButtonLink to="/sign-up" size="sm">
                Join Klyro
              </ButtonLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
