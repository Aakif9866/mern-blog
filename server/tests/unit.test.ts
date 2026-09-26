import { Types } from "mongoose";
import { decodeCursor, encodeCursor } from "../src/lib/pagination";
import { sanitizePostHtml } from "../src/lib/sanitize";
import { excerptFrom, extractMentions, normalizeTag, readTimeMinutes, slugify } from "../src/lib/text";
import { cosine, localEmbedding } from "../src/lib/ai/embeddings";

describe("utilities", () => {
  it("round-trips cursors including dates", () => {
    const id = new Types.ObjectId();
    const date = new Date("2025-01-02T03:04:05Z");
    const decoded = decodeCursor(encodeCursor(date, id));
    expect(decoded.value).toEqual(date);
    expect(String(decoded.id)).toBe(String(id));
    expect(() => decodeCursor("nope")).toThrow("Invalid cursor");
  });

  it("keeps code blocks but strips dangerous HTML", () => {
    const html = sanitizePostHtml('<pre><code class="language-ts">const a = 1;</code></pre><iframe src="x"></iframe><p style="color:red">t</p>');
    expect(html).toBe('<pre><code class="language-ts">const a = 1;</code></pre><p>t</p>');
  });

  it("slugifies, normalizes tags and finds mentions", () => {
    expect(slugify("  Héllo, World!  ")).toBe("hello-world");
    expect(normalizeTag("#Machine-Learning")).toBe("machinelearning");
    expect(extractMentions("hi @Alice and @bob_1, email a@b.com")).toEqual(["alice", "bob_1"]);
  });

  it("computes read time and excerpts", () => {
    expect(readTimeMinutes(`<p>${"word ".repeat(450)}</p>`)).toBe(2);
    expect(excerptFrom(`<p>${"alpha ".repeat(100)}</p>`, 20)).toMatch(/…$/);
    expect(excerptFrom("<h2>Title</h2><p>First.</p><ul><li>One</li><li>Two</li></ul>")).toBe("Title First. One Two");
  });

  it("ranks similar text higher with local embeddings", () => {
    const a = localEmbedding("react hooks state management in react components");
    const b = localEmbedding("managing state with react hooks");
    const c = localEmbedding("baking sourdough bread at home");
    expect(cosine(a, b)).toBeGreaterThan(cosine(a, c));
  });
});
