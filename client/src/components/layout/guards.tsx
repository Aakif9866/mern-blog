import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAppSelector } from "@/store";
import { PageSpinner } from "../ui/Spinner";
import type { Role } from "@/lib/types";

const RANK: Record<Role, number> = { user: 0, moderator: 1, admin: 2 };

export function RequireAuth({ children, role }: { children: ReactNode; role?: Role }) {
  const { user, status } = useAppSelector((s) => s.auth);
  const location = useLocation();
  if (status === "loading") return <PageSpinner />;
  if (!user) return <Navigate to={`/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (role && RANK[user.role] < RANK[role]) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, status } = useAppSelector((s) => s.auth);
  const next = new URLSearchParams(useLocation().search).get("next");
  if (status === "loading") return <PageSpinner />;
  if (user) return <Navigate to={next && next.startsWith("/") && !next.startsWith("//") ? next : "/"} replace />;
  return <>{children}</>;
}
