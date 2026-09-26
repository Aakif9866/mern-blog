import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useConfig } from "@/api/hooks";
import { api, errorMessage } from "@/lib/api";
import type { Me } from "@/lib/types";
import { useAppDispatch } from "@/store";
import { signedIn } from "@/store/authSlice";

interface GoogleId {
  accounts: {
    id: {
      initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
}

let scriptPromise: Promise<void> | null = null;
function loadGsi() {
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load Google sign-in"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** Google's own button; the ID token it returns is verified by the API. Hidden when not configured. */
export function GoogleButton({ next }: { next: string }) {
  const { data } = useConfig();
  const ref = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const clientId = data?.googleClientId;

  useEffect(() => {
    if (!clientId || !ref.current) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        const google = (window as unknown as { google?: GoogleId }).google;
        if (cancelled || !google || !ref.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            try {
              const r = await api.post<{ user: Me }>("/auth/google", { credential }, { noRefresh: true });
              dispatch(signedIn(r.user));
              navigate(r.user.onboarded ? next : "/onboarding", { replace: true });
            } catch (e) {
              toast.error(errorMessage(e));
            }
          },
        });
        google.accounts.id.renderButton(ref.current, { theme: "outline", size: "large", width: ref.current.clientWidth || 320, text: "continue_with", shape: "rectangular" });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [clientId, dispatch, navigate, next]);

  if (!clientId) return null;
  return (
    <>
      <div ref={ref} className="flex min-h-11 w-full justify-center" />
      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-ink-soft">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
    </>
  );
}
