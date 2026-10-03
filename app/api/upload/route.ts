// POST /api/upload
//
// Signed, server-side upload of the source product shot. The API secret never
// reaches the browser - the file is posted here, and this route hands it to
// Cloudinary with upload-time AI running on it:
//   - background_removal   : isolates the product
//   - quality_analysis     : flags a bad source before credits are spent
//   - auto tagging/caption : feeds the Library search

import { NextResponse } from "next/server";
import { cloudinary, hasCredentials, FOLDER, ROOT_TAG, CloudinaryConfigError } from "@/lib/cloudinary";
import { thumbUrl } from "@/lib/transforms";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Vercel caps a serverless request body at ~4.5 MB, and that limit is enforced
 * by the platform before this handler runs. Advertising anything larger would
 * mean the user hits an opaque 413 from the edge instead of this message.
 */
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request: Request) {
  if (!hasCredentials) {
    return NextResponse.json({ error: new CloudinaryConfigError().message }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  const runId = String(form.get("runId") || "source");
  // "source" is the generation base; "logo" is overlaid onto kit derivatives.
  const kind = form.get("kind") === "logo" ? "logo" : "source";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was attached." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `That file is ${(file.size / 1e6).toFixed(1)} MB. The limit is 4 MB — resize it and try again.`,
      },
      { status: 413 }
    );
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "That file is not an image." }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

  try {
    const uploaded = await cloudinary.uploader.upload(dataUri, {
      folder: kind === "logo" ? `${FOLDER}/logos` : `${FOLDER}/sources`,
      public_id: kind === "logo" ? `${runId}_logo` : `${runId}_source`,
      overwrite: true,
      resource_type: "image",
      tags: [ROOT_TAG, kind].join(","),
      // A logo is usually a flat PNG - quality analysis is meaningless on it.
      quality_analysis: kind === "source",
      context: { kind, run_id: runId },
    });

    return NextResponse.json({
      kind,
      publicId: uploaded.public_id,
      url: uploaded.secure_url,
      // A logo keeps its transparency and aspect ratio, so it is padded, not cropped.
      thumbUrl:
        kind === "logo"
          ? `${uploaded.secure_url.split("/upload/")[0]}/upload/c_pad,w_400,h_400,b_transparent,f_auto,q_auto/${uploaded.public_id}`
          : thumbUrl(uploaded.public_id, 400),
      width: uploaded.width,
      height: uploaded.height,
      bytes: uploaded.bytes,
      format: uploaded.format,
      originalBytes: file.size,
      // Proof the pipeline optimised the file, shown on the Brief screen.
      optimisedUrl: `${uploaded.secure_url.split("/upload/")[0]}/upload/f_auto,q_auto/${uploaded.public_id}.${uploaded.format}`,
      qualityScore:
        (uploaded as unknown as { quality_analysis?: { focus?: number } }).quality_analysis
          ?.focus ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[kiln] upload failed", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
