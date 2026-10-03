// POST /api/kit
//
// Builds the channel kit from the winning asset. Every output is a Cloudinary
// URL transformation of one stored asset - nothing is re-generated and nothing
// extra is stored, which is the point the Channel kit screen makes on screen.

import { NextResponse } from "next/server";
import { buildKit, ensureNamedTransformation, snippets } from "@/lib/transforms";
import { CLOUD_NAME, DEMO_MODE, hasCredentials } from "@/lib/cloudinary";
import { DEMO_CLOUD } from "@/lib/demo";
import { CHANNELS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: {
    publicId: string;
    channels?: string[];
    delivery?: string[];
    headline?: string;
    brandColor?: string;
    logoPublicId?: string;
    scrim?: boolean;
    demo?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.publicId) {
    return NextResponse.json({ error: "Pick a variation first." }, { status: 400 });
  }

  const useDemoCloud = Boolean(body.demo) || DEMO_MODE || !hasCredentials;
  const cloudName = useDemoCloud ? DEMO_CLOUD : CLOUD_NAME;

  const outputs = buildKit(
    body.publicId,
    body.channels?.length ? body.channels : CHANNELS.map((c) => c.id),
    {
      delivery: body.delivery?.length ? body.delivery : ["f_auto", "q_auto", "g_auto"],
      headline: body.headline,
      brandColor: body.brandColor,
      logoPublicId: body.logoPublicId,
      scrim: body.scrim,
      cloudName,
    }
  );

  // Register the kit centrally so stored URLs can be re-tuned later without edits.
  let namedTransformation: string | null = null;
  if (!useDemoCloud) {
    try {
      const named = await ensureNamedTransformation();
      namedTransformation = named.name;
    } catch (err) {
      console.warn("[kiln] named transformation unavailable:", err);
    }
  }

  return NextResponse.json({
    publicId: body.publicId,
    cloudName,
    namedTransformation,
    outputs,
    snippets: snippets(body.publicId, outputs, cloudName),
  });
}
