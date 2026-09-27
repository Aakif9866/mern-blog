import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Toaster, toast } from "sonner";
import { MailWarning, ShieldAlert, UserRound } from "lucide-react";
import { Link } from "react-router";
import { guestTimeLeft } from "@/lib/guest";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { MobileTabBar } from "./MobileTabBar";
import { SearchOverlay } from "./SearchOverlay";
import { useMe } from "@/store";
import { useAppSelector } from "@/store";
import { useSessionBootstrap } from "@/lib/session";
import { useThemeSync } from "@/lib/theme";
import { api, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";

const NO_ONBOARDING = ["/onboarding", "/verify-email", "/settings", "/sign-in", "/sign-up", "/reset-password", "/keep-account"];

function Banners() {
  const me = useMe();
  if (!me) return null;
  if (me.status === "suspended") {
    return (
      <div className="border-b border-amber-300/50 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        <div className="mx-auto flex max-w-7xl items-start gap-2 px-4 py-2.5 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Your account is suspended{me.suspendedUntil ? ` until ${formatDate(me.suspendedUntil)}` : ""}. You can read, but not post or comment.</span>
        </div>
      </div>
    );
  }
  if (me.isGuest) {
    return (
      <div className="border-b border-amber-300/60 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
          <UserRound className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-[1_1_16rem]">
            You're exploring as a guest. This session and everything in it is deleted in {guestTimeLeft(me.guestExpiresAt)}.
          </span>
          <Link
            to="/keep-account"
            className="-my-0.5 rounded-md px-1.5 py-0.5 font-semibold text-amber-900 underline decoration-2 underline-offset-2 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:text-white dark:hover:bg-amber-900 dark:focus-visible:outline-amber-200"
          >
            Create an account to keep it
          </Link>
        </div>
      </div>
    );
  }
  if (!me.emailVerified) {
    return (
      <div className="border-b border-brand-200/60 bg-brand-50 text-brand-900 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-100">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
          <MailWarning className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-[1_1_16rem]">
            Verify your email (<span className="font-medium [overflow-wrap:anywhere]">{me.email}</span>) to start writing and commenting.
          </span>
          <button
            className="-my-0.5 rounded-md px-1.5 py-0.5 font-semibold text-brand-700 underline decoration-2 underline-offset-2 hover:bg-brand-100 hover:text-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:text-white dark:hover:bg-brand-800 dark:hover:text-white dark:focus-visible:outline-brand-200"
            onClick={() =>
              api
                .post("/auth/resend-verification")
                .then(() => toast.success("Verification email sent"))
                .catch((e) => toast.error(errorMessage(e)))
            }
          >
            Resend email
          </button>
        </div>
      </div>
    );
  }
  return null;
}

export function AppShell() {
  useSessionBootstrap();
  useThemeSync();
  const me = useMe();
  const theme = useAppSelector((s) => s.ui.theme);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (me && (me.emailVerified || me.isGuest) && !me.onboarded && !NO_ONBOARDING.some((p) => pathname.startsWith(p))) navigate("/onboarding");
  }, [me, pathname, navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <Navbar />
      <Banners />
      <main id="main" className="flex-1 pb-20 sm:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileTabBar />
      <SearchOverlay />
      <Toaster position="top-center" richColors closeButton theme={theme === "system" ? "system" : theme} toastOptions={{ className: "font-sans" }} />
    </div>
  );
}
