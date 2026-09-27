import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignIn } from "@/pages/Auth";
import { CommentSection } from "@/components/comments/CommentSection";
import { guestTimeLeft } from "@/lib/guest";
import { jsonResponse, me, mockApi, renderApp } from "./utils";

const guest = { ...me, _id: "g1", username: "guest_ab12cd34", name: "Guest", isGuest: true, emailVerified: false, guestExpiresAt: new Date(Date.now() + 5 * 3600_000).toISOString() };

describe("guest mode", () => {
  it("starts a guest session from the sign-in page and goes to onboarding", async () => {
    mockApi({
      "GET /api/auth/config": () => jsonResponse({ googleClientId: null, aiEnabled: false }),
      "POST /api/auth/guest": () => jsonResponse({ user: guest }, 201),
    });
    const { store } = renderApp(<SignIn />, { path: "/sign-in", route: "/sign-in" });
    await userEvent.setup().click(screen.getByRole("button", { name: "Continue as guest" }));
    await waitFor(() => expect(store.getState().auth.user?.isGuest).toBe(true));
    expect(await screen.findByText("navigated")).toBeInTheDocument();
  });

  it("shows guests a sign-up prompt instead of the comment box", async () => {
    mockApi({ "GET /api/comments/post/p1": () => jsonResponse({ items: [], replies: [], nextCursor: null }) });
    renderApp(<CommentSection postId="p1" count={0} slug="x" />, { user: guest });
    expect(await screen.findByText(/Guests can't comment/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/keep-account");
    expect(screen.queryByLabelText("Write a comment")).not.toBeInTheDocument();
  });

  it("describes the time left on a guest session", () => {
    expect(guestTimeLeft(new Date(Date.now() + 5 * 3600_000).toISOString())).toBe("5 hours");
    expect(guestTimeLeft(new Date(Date.now() + 30 * 60_000).toISOString())).toBe("30 minutes");
  });
});
