// Run history, with Cloudinary as the only datastore.
//
// There is no database in this project. Every generated asset carries context
// metadata (run_id, brief, model, duration). The Runs screen reconstructs the
// pipeline history by searching Cloudinary and grouping on run_id.

import { cloudinary, ROOT_TAG } from "./cloudinary";
import type { RunRow } from "./types";

export function newRunId(): string {
  return "run_" + Math.random().toString(16).slice(2, 8);
}

interface SearchResource {
  public_id: string;
  created_at: string;
  context?: { custom?: Record<string, string> } | Record<string, string>;
  tags?: string[];
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

export async function listRuns(limit = 40): Promise<RunRow[]> {
  const res = await cloudinary.search
    .expression(`tags=${ROOT_TAG} AND resource_type:image`)
    .sort_by("created_at", "desc")
    .with_field("context")
    .with_field("tags")
    .max_results(200)
    .execute();

  const grouped = new Map<string, RunRow & { _durations: number[] }>();

  for (const resource of (res.resources ?? []) as SearchResource[]) {
    const c = ctx(resource);
    const runId = c.run_id;
    if (!runId) continue;

    let row = grouped.get(runId);
    if (!row) {
      row = {
        id: runId,
        brief: c.campaign || c.brief || "Untitled campaign",
        model: c.model || "-",
        variants: 0,
        derivatives: 0,
        durationMs: 0,
        credits: 0,
        status: "complete",
        createdAt: resource.created_at,
        _durations: [],
      };
      grouped.set(runId, row);
    }

    row.variants += 1;
    row.derivatives += Number(c.channels_count || 0);
    const ms = Number(c.ms || 0);
    if (ms) row._durations.push(ms);
    if (c.status === "error") row.status = "partial";
    if (resource.created_at < row.createdAt) row.createdAt = resource.created_at;
  }

  return [...grouped.values()]
    .map(({ _durations, ...row }) => ({
      ...row,
      durationMs: _durations.length ? Math.max(..._durations) : 0,
      credits: row.variants * 2,
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}
