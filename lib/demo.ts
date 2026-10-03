// Demo mode.
//
// Reads Cloudinary's public `demo` cloud, so the whole app - variations, channel
// kit, library, transformation strings - works end to end with no credentials
// and no generation credits. Set KILN_DEMO_MODE=true, or it switches on
// automatically when credentials are missing.
//
// Every URL below is still a live Cloudinary delivery URL with a real
// transformation chain, so the pipeline being demonstrated is genuine.

import type { ModelFamily, Variant, VisionResult } from "./types";
import { thumbUrl } from "./transforms";
import { deliveryUrl } from "./cloudinary";

export const DEMO_CLOUD = "demo";

const DEMO_ASSETS: { publicId: string; caption: string; tags: string[] }[] = [
  {
    publicId: "sample",
    caption: "Studio product composition on a neutral ground with soft directional light.",
    tags: ["studio", "product", "neutral", "soft-light"],
  },
  {
    publicId: "woman-blackdress-stairs",
    caption: "Editorial figure on architectural stairs, high contrast, strong vertical lines.",
    tags: ["editorial", "architecture", "high-contrast", "fashion"],
  },
  {
    publicId: "balloons",
    caption: "Bright saturated shapes against open sky with generous negative space.",
    tags: ["playful", "saturated", "sky", "negative-space"],
  },
  {
    publicId: "shoes",
    caption: "Footwear laid flat on a textured surface, even daylight, muted palette.",
    tags: ["footwear", "flat-lay", "daylight", "muted"],
  },
  {
    publicId: "coffee_cup",
    caption: "Close product crop with shallow depth of field and warm highlights.",
    tags: ["close-crop", "warm", "shallow-depth", "lifestyle"],
  },
  {
    publicId: "accessories-bag",
    caption: "Accessory still life on a plain plinth, hard shadow, matte backdrop.",
    tags: ["still-life", "accessory", "hard-shadow", "matte"],
  },
  {
    publicId: "landscapes/beach-boat",
    caption: "Wide outdoor scene with a single subject and open horizon.",
    tags: ["outdoor", "wide", "horizon", "natural"],
  },
  {
    publicId: "food/spices",
    caption: "Overhead arrangement of textured materials in a warm palette.",
    tags: ["overhead", "texture", "warm", "pattern"],
  },
];

export function demoVariants(
  count: number,
  model: ModelFamily,
  seed: number
): Variant[] {
  return Array.from({ length: count }, (_, i) => {
    const asset = DEMO_ASSETS[i % DEMO_ASSETS.length];
    const vision: VisionResult = {
      caption: asset.caption,
      tags: asset.tags,
      safe: true,
    };
    return {
      index: i,
      status: "done" as const,
      publicId: asset.publicId,
      url: deliveryUrl(asset.publicId, "f_auto,q_auto", DEMO_CLOUD),
      thumbUrl: thumbUrl(asset.publicId, 600, DEMO_CLOUD),
      width: 1024,
      height: 1024,
      bytes: 180_000 + i * 12_000,
      model,
      tier: "standard" as const,
      seed: seed + i * 7919,
      ms: 1400 + i * 180,
      vision,
      demo: true,
    };
  });
}

export function demoLibrary() {
  return DEMO_ASSETS.map((asset, i) => ({
    publicId: asset.publicId,
    url: deliveryUrl(asset.publicId, "f_auto,q_auto", DEMO_CLOUD),
    thumbUrl: thumbUrl(asset.publicId, 480, DEMO_CLOUD),
    format: "jpg",
    width: 1024,
    height: 768,
    bytes: 160_000 + i * 9_000,
    tags: asset.tags,
    model: ["flux", "ideogram", "recraft", "nano-banana"][i % 4],
    caption: asset.caption,
    createdAt: new Date(Date.now() - i * 86_400_000).toISOString(),
  }));
}

export function demoRuns() {
  const briefs = [
    "A/W26 Trail Series launch kit",
    "Spring drop - teaser set",
    "Studio accessories refresh",
    "Email hero, week 42",
    "Festival campaign - playful cut",
    "Packaging hero on slate",
  ];
  return briefs.map((brief, i) => ({
    id: `run_demo${(i + 1).toString().padStart(2, "0")}`,
    brief,
    model: ["flux", "ideogram", "recraft", "nano-banana", "flux", "gpt-image"][i],
    variants: [6, 4, 6, 2, 8, 4][i],
    derivatives: [24, 16, 24, 8, 32, 16][i],
    durationMs: [18400, 12200, 21000, 7400, 29800, 15100][i],
    credits: [12, 8, 12, 4, 16, 8][i],
    status: (i === 4 ? "partial" : "complete") as "complete" | "partial",
    createdAt: new Date(Date.now() - i * 7_200_000).toISOString(),
  }));
}
