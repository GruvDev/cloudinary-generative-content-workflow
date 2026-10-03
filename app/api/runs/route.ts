// GET /api/runs
//
// Pipeline history, rebuilt from Cloudinary. Each generated asset stores its
// run_id in context metadata; this route groups them back into runs.

import { NextResponse } from "next/server";
import { DEMO_MODE, hasCredentials } from "@/lib/cloudinary";
import { listRuns } from "@/lib/runs";
import { demoRuns } from "@/lib/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (DEMO_MODE || !hasCredentials) {
    return NextResponse.json({ rows: demoRuns(), demo: true });
  }

  try {
    const rows = await listRuns();
    return NextResponse.json({ rows, demo: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[kiln] runs failed", message);
    return NextResponse.json({ error: message, rows: [] }, { status: 502 });
  }
}
