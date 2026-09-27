import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate, RouterProvider, useRouteError } from "react-router";
import { AppShell } from "@/components/layout/AppShell";
import { GuestOnly, RequireAuth } from "@/components/layout/guards";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/Button";
import Home from "@/pages/Home";
import PostPage from "@/pages/PostPage";
import Profile from "@/pages/Profile";
import Search from "@/pages/Search";
import { TagPage, TagsIndex } from "@/pages/TagPage";
import { ForgotPassword, ResetPassword, SignIn, SignUp, VerifyEmail } from "@/pages/Auth";
import { About, Guidelines, NotFound } from "@/pages/Static";

// Heavy or signed-in-only screens load on demand.
const Write = lazy(() => import("@/pages/Write"));
const Moderation = lazy(() => import("@/pages/Moderation"));
const Settings = lazy(() => import("@/pages/Settings"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Bookmarks = lazy(() => import("@/pages/Bookmarks"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const SeriesPage = lazy(() => import("@/pages/SeriesPage"));
const KeepAccount = lazy(() => import("@/pages/KeepAccount"));

const load = (node: ReactNode) => <Suspense fallback={<PageSpinner />}>{node}</Suspense>;
const auth = (node: ReactNode, role?: "moderator" | "admin") => <RequireAuth role={role}>{load(node)}</RequireAuth>;

function RouteError() {
  const error = useRouteError() as Error | undefined;
  // A stale tab after a deploy can't find old lazy chunks; a reload fixes it.
  if (error?.message?.includes("dynamically imported module")) window.location.reload();
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <EmptyState title="Something went wrong" action={<ButtonLink to="/">Go home</ButtonLink>}>
        Try refreshing the page.
      </EmptyState>
    </div>
  );
}

export const routes = [
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: "post/:slug", element: <PostPage /> },
      { path: "u/:username", element: <Profile /> },
      { path: "tags", element: <TagsIndex /> },
      { path: "tags/:tag", element: <TagPage /> },
      { path: "series/:id", element: load(<SeriesPage />) },
      { path: "search", element: <Search /> },
      { path: "about", element: <About /> },
      { path: "guidelines", element: <Guidelines /> },
      { path: "sign-in", element: <GuestOnly><SignIn /></GuestOnly> },
      { path: "sign-up", element: <GuestOnly><SignUp /></GuestOnly> },
      { path: "forgot-password", element: <ForgotPassword /> },
      { path: "reset-password", element: <ResetPassword /> },
      { path: "verify-email", element: <VerifyEmail /> },
      { path: "write/:id?", element: auth(<Write />) },
      { path: "dashboard", element: auth(<Dashboard />) },
      { path: "bookmarks", element: auth(<Bookmarks />) },
      { path: "notifications", element: auth(<Notifications />) },
      { path: "settings", element: auth(<Settings />) },
      { path: "settings/notifications", element: <Navigate to="/settings?tab=notifications" replace /> },
      { path: "onboarding", element: auth(<Onboarding />) },
      { path: "keep-account", element: auth(<KeepAccount />) },
      { path: "mod", element: auth(<Moderation />, "moderator") },
      // v1 URLs
      { path: "projects", element: <Navigate to="/" replace /> },
      { path: "create-post", element: <Navigate to="/write" replace /> },
      { path: "*", element: <NotFound /> },
    ],
  },
];

const router = createBrowserRouter(routes);

export default function App() {
  return <RouterProvider router={router} />;
}
