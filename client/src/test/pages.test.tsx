import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignIn, SignUp } from "@/pages/Auth";
import { jsonResponse, me, mockApi, renderApp } from "./utils";

describe("Sign in", () => {
  it("signs in and stores only the user profile", async () => {
    const fetch = mockApi({
      "GET /api/auth/config": () => jsonResponse({ googleClientId: null, aiEnabled: false }),
      "POST /api/auth/login": () => jsonResponse({ user: me }),
    });
    const { store } = renderApp(<SignIn />, { path: "/sign-in", route: "/sign-in?next=/bookmarks" });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email or username"), "maya");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(store.getState().auth.user?.username).toBe("maya"));
    expect(await screen.findByText("navigated")).toBeInTheDocument();
    const login = fetch.mock.calls.find((c) => String(c[0]).endsWith("/auth/login"))!;
    expect(JSON.parse(String(login[1]?.body))).toEqual({ identifier: "maya", password: "password123" });
    expect(JSON.stringify(localStorage)).not.toMatch(/token/i);
  });

  it("shows the server error", async () => {
    mockApi({
      "GET /api/auth/config": () => jsonResponse({ googleClientId: null, aiEnabled: false }),
      "POST /api/auth/login": () => jsonResponse({ message: "Invalid email/username or password" }, 401),
    });
    renderApp(<SignIn />, { path: "/sign-in", route: "/sign-in" });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email or username"), "maya");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email/username or password");
  });
});

describe("Sign up", () => {
  it("shows field-level validation errors from the API", async () => {
    mockApi({
      "GET /api/auth/config": () => jsonResponse({ googleClientId: null, aiEnabled: false }),
      "POST /api/auth/register": () =>
        jsonResponse({ message: "username: invalid", code: "VALIDATION", details: [{ path: "username", message: "Use 3-30 lowercase letters, numbers or underscores" }] }, 400),
    });
    renderApp(<SignUp />, { path: "/sign-up", route: "/sign-up" });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Username"), "ab");
    await user.type(screen.getByLabelText("Email"), "a@b.dev");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Use 3-30 lowercase letters, numbers or underscores")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toHaveAttribute("aria-invalid", "true");
  });
});
