import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Toaster, toast } from "sonner";
import { MailWarning, ShieldAlert } from "lucide-react";
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

const NO_ONBOARDING = ["/onboarding", "/verify-email", "/settings", "/sign-in", "/sign-up", "/reset-password"];

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
  if (!me.emailVerified) {
    return (
      <div className="border-b border-brand-200/60 bg-brand-50 text-brand-900 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-100">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
          <MailWarning className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">Verify your email ({me.email}) to start writing and commenting.</span>
          <button
            className="font-semibold underline underline-offset-2"
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
    if (me && me.emailVerified && !me.onboarded && !NO_ONBOARDING.some((p) => pathname.startsWith(p))) navigate("/onboarding");
  }, [me, pathname, navigate]);

  useEffect(() => window.scrollTo(0, 0), [pathname]);

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
