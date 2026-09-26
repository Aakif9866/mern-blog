import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { vi } from "vitest";
import { makeStore } from "@/store";
import { signedIn, signedOut } from "@/store/authSlice";
import type { Me } from "@/lib/types";

export const me: Me = {
  _id: "u1",
  username: "maya",
  name: "Maya Chen",
  avatar: "",
  bio: "",
  email: "maya@klyro.dev",
  website: "",
  location: "",
  role: "user",
  status: "active",
  suspendedUntil: null,
  emailVerified: true,
  onboarded: true,
  followedTags: [],
  followersCount: 0,
  followingCount: 0,
  postsCount: 0,
  emailPrefs: { comments: true, mentions: true, follows: false, reactions: false, digest: true },
  googleLinked: false,
  createdAt: "2025-01-01T00:00:00Z",
};

export function renderApp(ui: ReactElement, { user, path = "/", route = "/" }: { user?: Me | null; path?: string; route?: string } = {}) {
  const store = makeStore();
  store.dispatch(user ? signedIn(user) : signedOut());
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path, element: ui },
      { path: "*", element: <div>navigated</div> },
    ],
    { initialEntries: [route] }
  );
  const result = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </Provider>
  );
  return { ...result, store, queryClient, router };
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Mocks fetch with a handler per "METHOD /path" (query string ignored). */
export function mockApi(routes: Record<string, (body: unknown) => Response | Promise<Response>>) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(String(input), "http://localhost");
    const key = `${init?.method ?? "GET"} ${url.pathname}`;
    const handler = routes[key];
    if (!handler) return jsonResponse({ message: `unmocked ${key}` }, 404);
    return handler(init?.body ? JSON.parse(String(init.body)) : undefined);
  });
}
