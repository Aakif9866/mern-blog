import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PostCard } from "@/components/post/PostCard";
import { CommentText } from "@/components/comments/CommentText";
import { TagInput } from "@/components/editor/TagInput";
import { ReactionBar } from "@/components/post/ReactionBar";
import { keys } from "@/api/keys";
import type { Post, ViewerState } from "@/lib/types";
import { jsonResponse, me, mockApi, renderApp } from "./utils";
import { useState } from "react";

const post: Post = {
  _id: "p1",
  author: { _id: "u2", username: "arjun", name: "Arjun Rao", avatar: "" },
  title: "Cursor pagination, explained",
  slug: "cursor-pagination",
  excerpt: "Offset pagination gets slower the deeper you go.",
  content: "<p>Body</p>",
  coverImage: "",
  tags: ["mongodb", "backend"],
  readTime: 4,
  views: 10,
  likesCount: 3,
  helpfulCount: 1,
  commentsCount: 2,
  bookmarksCount: 0,
  status: "published",
  publishedAt: "2026-09-01T00:00:00Z",
  scheduledFor: null,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  editedAt: null,
  series: null,
  tldr: "",
  seriesOrder: 0,
};

describe("PostCard", () => {
  it("shows the title, author, tags and counts with links", () => {
    renderApp(<PostCard post={post} />);
    expect(screen.getByRole("link", { name: post.title })).toHaveAttribute("href", "/post/cursor-pagination");
    expect(screen.getByRole("link", { name: /Arjun Rao/ })).toHaveAttribute("href", "/u/arjun");
    expect(screen.getByRole("link", { name: "#mongodb" })).toHaveAttribute("href", "/tags/mongodb");
    expect(screen.getByText("4 min read")).toBeInTheDocument();
    expect(screen.getByTitle("Likes")).toHaveTextContent("3");
  });
});

describe("CommentText", () => {
  it("links mentions and URLs but keeps other text as text", () => {
    renderApp(<CommentText text={"Thanks @Maya_1! See https://klyro.dev <b>no html</b>"} />);
    expect(screen.getByRole("link", { name: "@Maya_1" })).toHaveAttribute("href", "/u/maya_1");
    expect(screen.getByRole("link", { name: "https://klyro.dev" })).toHaveAttribute("rel", "noopener noreferrer nofollow");
    expect(screen.getByText(/<b>no html<\/b>/)).toBeInTheDocument();
  });
});

describe("TagInput", () => {
  function Harness() {
    const [tags, setTags] = useState<string[]>(["react"]);
    return <TagInput value={tags} onChange={setTags} />;
  }

  it("normalizes, de-duplicates and caps tags at five", async () => {
    const user = userEvent.setup();
    renderApp(<Harness />);
    const input = screen.getByLabelText("Add tag");
    await user.type(input, "#Web-Dev{Enter}react{Enter}css,ai go ");
    expect(screen.getAllByRole("button", { name: /Remove tag/ }).map((b) => b.getAttribute("aria-label"))).toEqual([
      "Remove tag react",
      "Remove tag webdev",
      "Remove tag css",
      "Remove tag ai",
      "Remove tag go",
    ]);
    expect(screen.queryByLabelText("Add tag")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove tag css" }));
    expect(screen.getByLabelText("Add tag")).toBeInTheDocument();
  });
});

describe("ReactionBar", () => {
  it("updates the like count optimistically and keeps the server count", async () => {
    let resolve!: (r: Response) => void;
    mockApi({ "POST /api/posts/p1/reactions": () => new Promise<Response>((r) => (resolve = r)) });
    const viewer: ViewerState = { liked: false, helpful: false, bookmarked: false, followingAuthor: false };
    function Bound() {
      return <ReactionBar post={post} viewer={viewer} onComment={() => {}} />;
    }
    const { queryClient } = renderApp(<Bound />, { user: me });
    queryClient.setQueryData(keys.post(post.slug), { post, viewer });

    await userEvent.setup().click(screen.getByRole("button", { name: "Like (3)" }));
    await waitFor(() => expect(queryClient.getQueryData<{ post: Post; viewer: ViewerState }>(keys.post(post.slug))?.viewer.liked).toBe(true));
    expect(queryClient.getQueryData<{ post: Post }>(keys.post(post.slug))?.post.likesCount).toBe(4);

    resolve(jsonResponse({ active: true, likesCount: 7, helpfulCount: 1 }));
    await waitFor(() => expect(queryClient.getQueryData<{ post: Post }>(keys.post(post.slug))?.post.likesCount).toBe(7));
  });

  it("sends signed-out readers to sign in", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const viewer: ViewerState = { liked: false, helpful: false, bookmarked: false, followingAuthor: false };
    renderApp(<ReactionBar post={post} viewer={viewer} onComment={() => {}} />, { user: null });
    await userEvent.setup().click(screen.getByRole("button", { name: "Like (3)" }));
    expect(await screen.findByText("navigated")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
