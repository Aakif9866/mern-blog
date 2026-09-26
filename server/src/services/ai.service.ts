import { z } from "zod";
import { Post } from "../models/Post";
import { Tag } from "../models/Tag";
import { askClaude } from "../lib/ai/claude";
import { embed } from "../lib/ai/embeddings";
import { htmlToText } from "../lib/sanitize";
import { normalizeTag } from "../lib/text";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { cache, cacheKeys } from "../lib/cache";
import { MAX_TAGS } from "./post.service";

const MAX_INPUT_CHARS = 60_000;

const TldrSchema = z.object({ tldr: z.string() });
const TagsSchema = z.object({ tags: z.array(z.string()) });

/** Two-to-three sentence summary, or "" when AI is unavailable. */
export async function summarize(title: string, html: string): Promise<string> {
  const text = htmlToText(html);
  if (text.length < 400) return "";
  const result = await askClaude({
    system:
      "You write TL;DR summaries for posts on Klyro, a community blogging platform. Write 2-3 plain sentences (under 60 words) capturing the post's main point and takeaway, in a neutral voice. No preamble, no markdown.",
    prompt: `Title: ${title}\n\n${text.slice(0, MAX_INPUT_CHARS)}`,
    schema: TldrSchema,
    maxTokens: 1500,
  });
  return result?.tldr.trim() ?? "";
}

/**
 * Suggests up to five tags. Claude picks from existing popular tags where they
 * fit; without AI, tags are matched by how often their names appear in the text.
 */
export async function suggestTags(title: string, html: string): Promise<string[]> {
  const text = `${title}\n\n${htmlToText(html)}`;
  const popular = await Tag.find({ postsCount: { $gt: 0 } }).sort({ postsCount: -1 }).limit(80).select("slug").lean();
  const known = popular.map((t) => t.slug);

  if (env.aiEnabled) {
    const result = await askClaude({
      system:
        "You suggest tags for posts on Klyro, a community blogging platform. Tags are single lowercase words or joined words without spaces (e.g. javascript, webdev, machinelearning). Prefer tags from the existing list when they fit; invent new ones only when nothing fits. Return 3 to 5 tags, most relevant first.",
      prompt: `Existing tags: ${known.join(", ") || "(none yet)"}\n\nPost:\n${text.slice(0, MAX_INPUT_CHARS)}`,
      schema: TagsSchema,
      maxTokens: 1000,
    });
    if (result) return [...new Set(result.tags.map(normalizeTag).filter(Boolean))].slice(0, MAX_TAGS);
  }

  const lower = text.toLowerCase();
  return known
    .map((slug) => ({ slug, hits: lower.split(slug).length - 1 }))
    .filter((t) => t.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, MAX_TAGS)
    .map((t) => t.slug);
}

/** Job run after publish/edit: refresh the TL;DR and the embedding used for related posts. */
export async function enrichPost(postId: string): Promise<void> {
  const post = await Post.findById(postId).select("title content tags slug status");
  if (!post || post.status !== "published") return;
  const [tldr, embedding] = await Promise.all([
    summarize(post.title, post.content),
    embed(`${post.title}\n${post.tags.join(" ")}\n${htmlToText(post.content).slice(0, 8000)}`),
  ]);
  await Post.updateOne({ _id: post._id }, { ...(tldr ? { tldr } : {}), embedding });
  await cache.del(cacheKeys.post(post.slug));
  logger.debug({ postId, tldr: Boolean(tldr) }, "post enriched");
}
