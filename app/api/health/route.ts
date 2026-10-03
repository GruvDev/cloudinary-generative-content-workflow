// GET /api/health
//
// Powers the "Test connection" button in the Cloudinary connection dialog.
// Reports which parts of the pipeline are actually live on this account, so a
// missing add-on is visible immediately instead of failing mid-demo.

import { NextResponse } from "next/server";
import { cloudinary, CLOUD_NAME, DEMO_MODE, hasCredentials, FOLDER } from "@/lib/cloudinary";
import { IMAGE_GEN_BASE } from "@/lib/imagegen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const report = {
    cloudName: CLOUD_NAME || null,
    folder: FOLDER,
    demoMode: DEMO_MODE || !hasCredentials,
    credentials: hasCredentials,
    ping: false,
    usage: null as null | { credits?: number; plan?: string },
    imageGenBase: IMAGE_GEN_BASE,
    message: "",
  };

  if (!hasCredentials) {
    report.message =
      "No credentials found. The app is running on sample assets. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to .env.local.";
    return NextResponse.json(report);
  }

  try {
    await cloudinary.api.ping();
    report.ping = true;
  } catch (err) {
    report.message = `Cloudinary rejected the credentials: ${
      err instanceof Error ? err.message : String(err)
    }`;
    return NextResponse.json(report, { status: 502 });
  }

  try {
    const usage = (await cloudinary.api.usage()) as unknown as {
      credits?: { usage?: number; limit?: number };
      plan?: string;
    };
    report.usage = {
      credits: usage.credits?.limit
        ? Math.max(0, Math.round((usage.credits.limit - (usage.credits.usage ?? 0)) * 100) / 100)
        : undefined,
      plan: usage.plan,
    };
  } catch {
    // Usage is informational only.
  }

  report.message = "Connected. Upload, transformation, search and delivery are live.";
  return NextResponse.json(report);
}
