import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { env } from "../../config/env";
import { logger } from "../logger";

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 2 });
  return client;
}

/**
 * One structured-output call to Claude. Returns null (and logs) when AI is not
 * configured, the model refuses, or the request fails, so callers can fall back.
 */
export async function askClaude<S extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  schema: S;
  maxTokens?: number;
}): Promise<z.infer<S> | null> {
  const anthropic = getClient();
  if (!anthropic) return null;
  try {
    const response = await anthropic.beta.messages.parse({
      model: env.AI_MODEL,
      max_tokens: opts.maxTokens ?? 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(opts.schema) },
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
    });
    if (response.stop_reason === "refusal") {
      logger.warn({ category: response.stop_details?.category }, "Claude declined an AI request");
      return null;
    }
    return (response.parsed_output as z.infer<S> | null) ?? null;
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) logger.warn("Claude rate limited");
    else if (err instanceof Anthropic.APIError) logger.error({ status: err.status, msg: err.message }, "Claude API error");
    else logger.error({ err }, "Claude request failed");
    return null;
  }
}
