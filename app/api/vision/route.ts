// POST /api/vision
//
// Re-runs AI Vision on one asset. The generate route already does this inline;
// this endpoint exists so the "Inspect" button on a variation card can refresh
// the caption and tags on demand.

import { NextResponse } from "next/server";
import { DEMO_MODE, hasCredentials } from "@/lib/cloudinary";
import { describeAsset } from "@/lib/vision";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { publicId: string; url: string; prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.publicId || !body.url) {
    return NextResponse.json({ error: "publicId and url are required." }, { status: 400 });
  }

  if (DEMO_MODE || !hasCredentials) {
    return NextResponse.json({
      caption: "Sample asset from Cloudinary's public demo cloud.",
      tags: ["demo", "sample", "studio"],
      safe: true,
      demo: true,
    });
  }

  try {
    const vision = await describeAsset(body.publicId, body.url, body.prompt || "");
    return NextResponse.json(vision);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
