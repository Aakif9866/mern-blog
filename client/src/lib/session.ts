import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, setSessionExpiredHandler } from "./api";
import { connectSocket, disconnectSocket } from "./socket";
import { keys } from "@/api/keys";
import type { Me, NotificationItem } from "./types";
import { signedIn, signedOut } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store";
import { displayName } from "./format";

/** Loads the current user once on startup and keeps real-time notifications connected. */
export function useSessionBootstrap() {
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  const status = useAppSelector((s) => s.auth.status);

  useEffect(() => {
    setSessionExpiredHandler(() => dispatch(signedOut()));
    api
      .get<{ user: Me | null }>("/auth/session")
      .then((r) => dispatch(r.user ? signedIn(r.user) : signedOut()))
      .catch(() => dispatch(signedOut()));
  }, [dispatch]);

  useEffect(() => {
    if (status !== "authenticated") {
      disconnectSocket();
      return;
    }
    const socket = connectSocket();
    const onNotification = (n: NotificationItem) => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      toast(notificationText(n), { description: n.post?.title });
    };
    socket.on("notification", onNotification);
    return () => {
      socket.off("notification", onNotification);
    };
  }, [status, qc]);
}

export function notificationText(n: NotificationItem): string {
  const who = displayName(n.actor);
  switch (n.type) {
    case "follow":
      return `${who} started following you`;
    case "reaction":
      return n.reaction === "helpful" ? `${who} found your post helpful` : `${who} liked your post`;
    case "comment":
      return `${who} commented on your post`;
    case "reply":
      return `${who} replied to your comment`;
    case "mention":
      return `${who} mentioned you`;
    default:
      return n.message ?? "Update from the moderation team";
  }
}

export async function logout(dispatch: ReturnType<typeof useAppDispatch>, qc: ReturnType<typeof useQueryClient>, everywhere = false) {
  await api.post(everywhere ? "/auth/logout-all" : "/auth/logout").catch(() => undefined);
  dispatch(signedOut());
  qc.clear();
  void qc.invalidateQueries({ queryKey: keys.me });
}
