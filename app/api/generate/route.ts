// POST /api/generate
//
// Generates ONE variation and returns it. The browser fires N of these in
// parallel, one per variation. This is deliberate: a single serverless
// invocation that generated six images in sequence would blow past Vercel's
// function timeout. One image per call keeps every invocation short.

import { NextResponse } from "next/server";
import {
  DEMO_MODE,
  FOLDER,
  hasCredentials,
  CLOUD_NAME,
} from "@/lib/cloudinary";
import { generateVariant, variantPublicId } from "@/lib/imagegen";
import { buildPrompt, promptForVariation, seedForVariation } from "@/lib/prompt";
import { describeAsset } from "@/lib/vision";
import { thumbUrl } from "@/lib/transforms";
import { demoVariants } from "@/lib/demo";
import type { Brief, Variant } from "@/lib/types";
import { ASPECT_DIMS } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const STRENGTH_VALUE: Record<string, number> = {
  Subtle: 0.25,
  Balanced: 0.55,
  Loose: 0.85,
};

export async function POST(request: Request) {
  const started = Date.now();

  let body: { brief: Brief; index: number; runId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { brief, index, runId } = body;

  if (!brief?.brief?.trim()) {
    return NextResponse.json(
      { error: "The creative brief is empty. Describe the campaign first." },
      { status: 400 }
    );
  }
  if (typeof index !== "number" || index < 0 || index > 15) {
    return NextResponse.json({ error: "Bad variation index." }, { status: 400 });
  }

  const seedBase = Number(brief.seed) || 48219;
  const seed = brief.seedLock
    ? seedForVariation(seedBase, index)
    : Math.floor(Math.random() * 2_000_000);

  // Demo mode: a real Cloudinary delivery URL from the public demo cloud.
  if (DEMO_MODE || !hasCredentials) {
    const variant = demoVariants(index + 1, brief.model, seedBase)[index];
    await new Promise((r) => setTimeout(r, 400 + index * 120));
    return NextResponse.json({
      ...variant,
      index,
      ms: Date.now() - started,
      note: hasCredentials
        ? "Demo mode is on (KILN_DEMO_MODE=true)."
        : "Running on sample assets - Cloudinary credentials are not set.",
    } satisfies Variant & { note: string });
  }

  const basePrompt = buildPrompt(brief);
  const prompt = promptForVariation(basePrompt, index);
  const publicId = variantPublicId(runId, index);
  const dims = ASPECT_DIMS[brief.aspect];

  try {
    const generated = await generateVariant({
      prompt,
      model: brief.model,
      tier: brief.tier,
      aspect: brief.aspect,
      seed,
      publicId,
      sourcePublicId: brief.sourcePublicId,
      strengthValue: STRENGTH_VALUE[brief.strength] ?? 0.55,
      tags: [`model-${brief.model}`, runId],
      context: {
        run_id: runId,
        campaign: brief.name || "Untitled campaign",
        model: brief.model,
        tier: brief.tier,
        seed: String(seed),
        variation: String(index + 1),
        channels_count: String(brief.channels?.length ?? 0),
        ms: String(Date.now() - started),
      },
    });

    // AI Vision: caption + tags, written back onto the asset.
    const vision = await describeAsset(generated.publicId, generated.url, prompt);

    const variant: Variant = {
      index,
      status: "done",
      publicId: generated.publicId,
      url: generated.url,
      thumbUrl: thumbUrl(generated.publicId, 600),
      width: generated.width || dims.width,
      height: generated.height || dims.height,
      bytes: generated.bytes,
      model: brief.model,
      tier: brief.tier,
      seed,
      ms: Date.now() - started,
      vision,
    };

    return NextResponse.json({ ...variant, via: generated.via, cloudName: CLOUD_NAME, folder: FOLDER });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[kiln] generate failed", message);
    return NextResponse.json(
      {
        index,
        status: "error",
        error: message,
        ms: Date.now() - started,
      } satisfies Variant,
      { status: 502 }
    );
  }
}
