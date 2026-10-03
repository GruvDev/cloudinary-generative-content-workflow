// GET /api/library?q=&tag=
//
// The Library screen. Backed entirely by the Cloudinary Search API - there is no
// database in this project. The free-text box searches the AI Vision captions
// and tags that were written back onto each asset at generation time, which is
// what makes it a search "by what is in the image".

import { NextResponse } from "next/server";
import { cloudinary, hasCredentials, DEMO_MODE, ROOT_TAG } from "@/lib/cloudinary";
import { thumbUrl } from "@/lib/transforms";
import { demoLibrary, DEMO_CLOUD } from "@/lib/demo";
import type { LibraryItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SearchResource {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
  tags?: string[];
  context?: { custom?: Record<string, string> } | Record<string, string>;
}

/** Cloudinary returns context either flat or nested under `custom`, depending on the call. */
function ctx(resource: SearchResource): Record<string, string> {
  const raw = resource.context;
  if (!raw || typeof raw !== "object") return {};
  if ("custom" in raw && raw.custom && typeof raw.custom === "object") {
    return raw.custom as Record<string, string>;
  }
  return raw as Record<string, string>;
}

/** Cloudinary search expressions need quotes escaped out of user input. */
function sanitise(input: string): string {
  return input.replace(/["\\]/g, " ").trim().slice(0, 80);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = sanitise(searchParams.get("q") || "");
  const tag = searchParams.get("tag") || "";

  if (DEMO_MODE || !hasCredentials) {
    let items = demoLibrary();
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter(
        (i) =>
          i.caption.toLowerCase().includes(needle) ||
          i.tags.some((t) => t.includes(needle)) ||
          i.publicId.toLowerCase().includes(needle)
      );
    }
    if (tag && tag !== "All") {
      items = items.filter((i) => i.model === tag || i.tags.includes(tag.toLowerCase()));
    }
    return NextResponse.json({ items, total: items.length, cloudName: DEMO_CLOUD, demo: true });
  }

  const clauses = [`tags=${ROOT_TAG}`, "resource_type:image"];
  if (tag && tag !== "All") clauses.push(`tags=${tag}`);
  // Free text hits filename, tags and contextual metadata (the AI Vision caption).
  if (q) clauses.push(`(tags:${q}* OR context.caption:${q}* OR public_id:*${q}*)`);

  const runSearch = (expression: string) =>
    cloudinary.search
      .expression(expression)
      .sort_by("created_at", "desc")
      .with_field("context")
      .with_field("tags")
      .max_results(60)
      .execute();

  try {
    let res;
    try {
      res = await runSearch(clauses.join(" AND "));
    } catch (err) {
      // The free-text clause is the only part that can be rejected as a bad
      // expression. Fall back to the plain tag listing rather than showing the
      // user an empty, broken Library.
      if (!q) throw err;
      console.warn("[kiln] full-text search rejected, falling back to tag listing");
      res = await runSearch(`tags=${ROOT_TAG} AND resource_type:image`);
    }

    const items: LibraryItem[] = ((res.resources ?? []) as SearchResource[]).map((r) => {
      const c = ctx(r);
      return {
        publicId: r.public_id,
        url: r.secure_url,
        thumbUrl: thumbUrl(r.public_id, 480),
        format: r.format,
        width: r.width,
        height: r.height,
        bytes: r.bytes,
        tags: r.tags ?? [],
        model: c.model || "-",
        caption: c.caption,
        createdAt: r.created_at,
      };
    });

    return NextResponse.json({ items, total: res.total_count ?? items.length, demo: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[kiln] library search failed", message);
    return NextResponse.json({ error: message, items: [] }, { status: 502 });
  }
}
