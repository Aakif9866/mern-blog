import { createHash } from "node:crypto";
import { env } from "../../config/env";
import { logger } from "../logger";

/**
 * Text embeddings for "related posts". Uses Voyage AI when VOYAGE_API_KEY is
 * set; otherwise a local feature-hashing bag-of-words vector, which needs no
 * network and still groups posts that share vocabulary.
 */
const LOCAL_DIMS = 512;
const STOPWORDS = new Set(
  "a an and are as at be but by for from has have how i if in into is it its of on or that the this to was we what when which will with you your can do not our they their there these those about just more also".split(" ")
);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function bucket(token: string): { index: number; sign: number } {
  const h = createHash("md5").update(token).digest();
  return { index: h.readUInt32BE(0) % LOCAL_DIMS, sign: (h[4] ?? 0) & 1 ? 1 : -1 };
}

export function localEmbedding(text: string): number[] {
  const vec = new Array<number>(LOCAL_DIMS).fill(0);
  const tokens = tokenize(text);
  const features = [...tokens, ...tokens.slice(1).map((t, i) => `${tokens[i]}_${t}`)];
  for (const f of features) {
    const { index, sign } = bucket(f);
    vec[index] = (vec[index] ?? 0) + sign;
  }
  return normalize(vec);
}

function normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => Number((v / norm).toFixed(5)));
}

async function voyageEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.VOYAGE_API_KEY}` },
      body: JSON.stringify({ model: env.VOYAGE_MODEL, input: [text.slice(0, 16000)], input_type: "document" }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Voyage ${res.status}`);
    const json = (await res.json()) as { data?: { embedding: number[] }[] };
    return json.data?.[0]?.embedding ?? null;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Voyage embedding failed, using local embedding");
    return null;
  }
}

export async function embed(text: string): Promise<number[]> {
  if (env.VOYAGE_API_KEY) {
    const v = await voyageEmbedding(text);
    if (v) return v;
  }
  return localEmbedding(text);
}

export function cosine(a: number[] | undefined, b: number[] | undefined): number {
  if (!a || !b) return 0;
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] as number;
    const y = b[i] as number;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
