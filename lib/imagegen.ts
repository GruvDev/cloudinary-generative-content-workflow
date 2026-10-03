// Cloudinary Image Generation.
//
// Primary path  : Cloudinary Image Generation API (text-to-image / image-to-image,
//                 model family + tier chosen per request, saved as a managed asset).
// Fallback path : Cloudinary generative transformations (generative background
//                 replace / generative fill) applied to the uploaded source asset,
//                 then stored as a new managed asset.
//
// The fallback exists because the Image Generation add-on is an early-access
// add-on that has to be enabled per account. If it is not enabled, the app still
// does real AI image work inside the Cloudinary pipeline rather than breaking.

import {
  API_KEY,
  API_SECRET,
  CLOUD_NAME,
  CloudinaryConfigError,
  FOLDER,
  ROOT_TAG,
  basicAuthHeader,
  cloudinary,
  deliveryUrl,
  hasCredentials,
} from "./cloudinary";
import { ASPECT_DIMS, type Aspect, type ModelFamily, type Tier } from "./types";

/**
 * Base URL for the Image Generation API.
 * Confirm this against the Image Generation API reference in your own Cloudinary
 * console and override with CLOUDINARY_IMAGEGEN_BASE if it differs.
 */
export const IMAGE_GEN_BASE =
  process.env.CLOUDINARY_IMAGEGEN_BASE || "https://api.cloudinary.com/v2";

export interface GenerateArgs {
  prompt: string;
  model: ModelFamily;
  tier: Tier;
  aspect: Aspect;
  seed?: number;
  publicId: string;
  /** When present, the generation is guided by this already-uploaded asset. */
  sourcePublicId?: string;
  /** How far the result may drift from the source. */
  strengthValue?: number;
  tags: string[];
  context: Record<string, string>;
}

export interface GenerateResult {
  publicId: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  via: "image-generation-api" | "generative-transform";
}

/** Pulls public_id / url out of the response whatever shape it arrives in. */
function readAsset(payload: unknown): {
  publicId?: string;
  url?: string;
  width?: number;
  height?: number;
  bytes?: number;
} {
  const seen = new Set<unknown>();
  const out: {
    publicId?: string;
    url?: string;
    width?: number;
    height?: number;
    bytes?: number;
  } = {};

  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const obj = node as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        if (!out.publicId && (key === "public_id" || key === "publicId")) out.publicId = value;
        if (!out.url && (key === "secure_url" || key === "url" || key === "asset_url"))
          out.url = value;
      } else if (typeof value === "number") {
        if (!out.width && key === "width") out.width = value;
        if (!out.height && key === "height") out.height = value;
        if (!out.bytes && (key === "bytes" || key === "size")) out.bytes = value;
      } else {
        walk(value);
      }
    }
  };

  walk(payload);
  return out;
}

async function callImageGenerationApi(args: GenerateArgs): Promise<GenerateResult> {
  const dims = ASPECT_DIMS[args.aspect];
  const endpoint = args.sourcePublicId ? "image_to_image" : "text_to_image";

  const payload: Record<string, unknown> = {
    prompt: args.prompt,
    model: { family: args.model, tier: args.tier },
    // Saving as a managed asset is the whole point: the generated image becomes a
    // first-class Cloudinary asset that can then be transformed and delivered.
    target: {
      target_type: "managed_asset",
      public_id: args.publicId,
      tags: args.tags,
    },
    width: dims.width,
    height: dims.height,
  };

  if (typeof args.seed === "number") payload.seed = args.seed;

  if (args.sourcePublicId) {
    payload.reference_images = [{ public_id: args.sourcePublicId }];
    if (typeof args.strengthValue === "number") payload.strength = args.strengthValue;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  let res: Response;
  try {
    res = await fetch(`${IMAGE_GEN_BASE}/generate/${CLOUD_NAME}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: basicAuthHeader(),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Image Generation API returned ${res.status}: ${text.slice(0, 300)}`
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Image Generation API returned a non-JSON response.");
  }

  const asset = readAsset(json);
  const publicId = asset.publicId || args.publicId;
  const dimsOut = ASPECT_DIMS[args.aspect];

  return {
    publicId,
    url: asset.url || deliveryUrl(publicId, "f_auto,q_auto"),
    width: asset.width ?? dimsOut.width,
    height: asset.height ?? dimsOut.height,
    bytes: asset.bytes ?? 0,
    via: "image-generation-api",
  };
}

/**
 * Fallback: use Cloudinary's generative AI transformations on the source asset.
 * `e_gen_background_replace` re-imagines the whole scene around the product from
 * a prompt, which is exactly the campaign-visual job - and it produces a real
 * Cloudinary asset we then store under the run's folder.
 */
async function generativeTransform(args: GenerateArgs): Promise<GenerateResult> {
  if (!args.sourcePublicId) {
    throw new Error(
      "The Image Generation add-on is not available on this account and no source image was uploaded. " +
        "Upload a product shot on the Brief screen to use generative transformations instead, or enable the add-on."
    );
  }

  const dims = ASPECT_DIMS[args.aspect];
  // Prompts inside a transformation cannot contain commas or slashes.
  const safePrompt = args.prompt
    .replace(/[,/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 380);

  const transform = [
    `e_gen_background_replace:prompt_${encodeURIComponent(safePrompt)}`,
    `c_fill,g_auto,w_${dims.width},h_${dims.height}`,
    "f_auto,q_auto",
  ].join("/");

  const sourceUrl = deliveryUrl(args.sourcePublicId, transform);

  // Cloudinary fetches its own derived URL and stores the result as a new asset.
  const uploaded = await cloudinary.uploader.upload(sourceUrl, {
    public_id: args.publicId,
    folder: undefined,
    tags: args.tags,
    context: args.context,
    overwrite: true,
    resource_type: "image",
  });

  return {
    publicId: uploaded.public_id,
    url: uploaded.secure_url,
    width: uploaded.width,
    height: uploaded.height,
    bytes: uploaded.bytes,
    via: "generative-transform",
  };
}

export async function generateVariant(args: GenerateArgs): Promise<GenerateResult> {
  if (!hasCredentials) throw new CloudinaryConfigError();

  try {
    const result = await callImageGenerationApi(args);
    // Tag and annotate so the Library and Runs screens can find it later.
    await annotate(result.publicId, args.tags, args.context);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[kiln] Image Generation API unavailable, falling back:", message);
    const result = await generativeTransform(args);
    await annotate(result.publicId, args.tags, args.context);
    return result;
  }
}

/**
 * Attach tags and context metadata. Cloudinary is the database for this project,
 * so this is what makes an asset findable on the Library and Runs screens.
 *
 * add_tag / add_context MERGE. uploader.explicit with `tags` or `context` would
 * REPLACE the whole set, so a later write (AI Vision) would silently delete the
 * `kiln` root tag and the run_id - and both screens would go empty.
 */
async function annotate(
  publicId: string,
  tags: string[],
  context: Record<string, string>
): Promise<void> {
  try {
    await cloudinary.uploader.add_tag([ROOT_TAG, ...tags].join(","), [publicId]);
  } catch (err) {
    console.warn("[kiln] could not tag asset", publicId, err);
  }

  // Context is sent as key=value pairs separated by |, so those two characters
  // must not appear inside a value.
  const pairs = Object.entries(context)
    .map(([k, v]) => `${k}=${String(v).replace(/[|=]/g, " ")}`)
    .join("|");

  try {
    await cloudinary.uploader.add_context(pairs, [publicId]);
  } catch (err) {
    console.warn("[kiln] could not add context to asset", publicId, err);
  }
}

export function variantPublicId(runId: string, index: number): string {
  return `${FOLDER}/${runId}/v${index + 1}`;
}

export function credentialsSummary() {
  return {
    cloudName: CLOUD_NAME,
    hasKey: Boolean(API_KEY),
    hasSecret: Boolean(API_SECRET),
    folder: FOLDER,
  };
}
