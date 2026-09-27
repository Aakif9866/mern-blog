import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { api, errorMessage } from "./api";
import type { Me } from "./types";
import { useAppDispatch } from "@/store";
import { signedIn } from "@/store/authSlice";

/** Starts a temporary guest session and sends the guest through onboarding. */
export function useStartGuest() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => api.post<{ user: Me }>("/auth/guest", undefined, { noRefresh: true }),
    onSuccess: (r) => {
      dispatch(signedIn(r.user));
      navigate("/onboarding", { replace: true });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

/** "5 hours" / "40 minutes" until the guest account is deleted. */
export function guestTimeLeft(expiresAt: string | null | undefined): string {
  if (!expiresAt) return "24 hours";
  const minutes = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60_000));
  if (minutes >= 90) return `${Math.round(minutes / 60)} hours`;
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
