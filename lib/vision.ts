// Cloudinary AI Vision.
//
// Every generated asset is described and tagged automatically. Those captions
// and tags are written back onto the asset as Cloudinary context + tags, which
// is what makes the Library screen searchable "by meaning" rather than by filename.
//
// Three levels, tried in order, so a missing add-on degrades instead of breaking:
//   1. Analyze API  (ai_vision_general / captioning)
//   2. Upload-time detection via uploader.explicit
//   3. Keyword extraction from the prompt itself

import { CLOUD_NAME, basicAuthHeader, cloudinary } from "./cloudinary";
import type { VisionResult } from "./types";

const ANALYZE_BASE =
  process.env.CLOUDINARY_ANALYZE_BASE || "https://api.cloudinary.com/v2/analysis";

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "on", "in", "with", "for", "to", "from",
  "no", "not", "any", "at", "by", "is", "are", "be", "this", "that", "it", "its",
  "do", "does", "very", "high", "image", "photo", "shot", "room", "space", "text",
  "words", "letters", "logos", "detail", "focus", "professional", "commercial",
  "photography", "leave", "clean", "empty", "upper", "third", "headline", "render",
]);

function keywordsFrom(text: string, limit = 6): string[] {
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9-]+/)) {
    const word = raw.trim();
    if (word.length < 4 || STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function parseVision(payload: unknown): Partial<VisionResult> {
  const out: Partial<VisionResult> = {};
  const tags = new Set<string>();
  const seen = new Set<unknown>();

  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (typeof value === "string") {
        if (!out.caption && /caption|description|answer|summary|text/i.test(key) && value.length > 12) {
          out.caption = value;
        }
        if (/^(tag|name|label|value)$/i.test(key) && value.length < 28) {
          tags.add(value.toLowerCase());
        }
      } else if (typeof value === "boolean" && /safe|approved|pass/i.test(key)) {
        out.safe = value;
      } else {
        walk(value);
      }
    }
  };

  walk(payload);
  if (tags.size) out.tags = [...tags].slice(0, 6);
  return out;
}

async function analyzeApi(imageUrl: string): Promise<Partial<VisionResult>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${ANALYZE_BASE}/${CLOUD_NAME}/analyze/uri`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: basicAuthHeader(),
      },
      body: JSON.stringify({
        analysis_type: "captioning",
        uri: imageUrl,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`analyze ${res.status}`);
    return parseVision(await res.json());
  } finally {
    clearTimeout(timeout);
  }
}

async function detectionOnAsset(publicId: string): Promise<Partial<VisionResult>> {
  const res = await cloudinary.uploader.explicit(publicId, {
    type: "upload",
    resource_type: "image",
    detection: "captioning",
  });
  return parseVision(res);
}

/**
 * Describe and tag one asset, then write the result back onto the asset so the
 * Library can search it. Never throws - vision is an enhancement, not a blocker.
 */
export async function describeAsset(
  publicId: string,
  imageUrl: string,
  promptFallback: string
): Promise<VisionResult> {
  let partial: Partial<VisionResult> = {};

  for (const attempt of [
    () => analyzeApi(imageUrl),
    () => detectionOnAsset(publicId),
  ]) {
    try {
      const got = await attempt();
      partial = { ...got, ...partial };
      if (partial.caption && partial.tags?.length) break;
    } catch (err) {
      console.warn("[kiln] vision step failed:", err instanceof Error ? err.message : err);
    }
  }

  const result: VisionResult = {
    caption: partial.caption || promptFallback.split(".")[0].slice(0, 120),
    tags: partial.tags?.length ? partial.tags : keywordsFrom(promptFallback),
    safe: partial.safe !== false,
  };

  // Write it back: tags make the asset findable, context makes it readable.
  //
  // IMPORTANT: use add_tag / add_context, NOT uploader.explicit. Passing `tags`
  // or `context` to explicit REPLACES the whole set, which would wipe the `kiln`
  // root tag and the run_id context written at generation time - and with them
  // the Library search and the Runs history. add_* merges.
  try {
    await cloudinary.uploader.add_tag(result.tags.join(","), [publicId]);
  } catch (err) {
    console.warn("[kiln] could not add vision tags:", err);
  }

  try {
    const escaped = result.caption.replace(/[|=]/g, " ");
    await cloudinary.uploader.add_context(`caption=${escaped}|alt=${escaped}`, [
      publicId,
    ]);
  } catch (err) {
    console.warn("[kiln] could not add vision context:", err);
  }

  return result;
}
