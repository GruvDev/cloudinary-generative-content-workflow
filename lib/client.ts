// Browser-side API helpers.

import type { Brief, KitOutput, LibraryItem, RunRow, Variant } from "./types";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json.error || `Request failed (${res.status})`), { payload: json });
  return json as T;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as T;
}

/** One variation. Called N times in parallel - see the comment in /api/generate. */
export function generateVariation(
  brief: Brief,
  index: number,
  runId: string
): Promise<Variant & { via?: string; note?: string }> {
  return post(`/api/generate`, { brief, index, runId });
}

export function buildKitRequest(payload: {
  publicId: string;
  channels: string[];
  delivery: string[];
  headline?: string;
  brandColor?: string;
  logoPublicId?: string;
  scrim?: boolean;
  demo?: boolean;
}): Promise<{
  publicId: string;
  cloudName: string;
  namedTransformation: string | null;
  outputs: KitOutput[];
  snippets: { url: string; html: string; node: string };
}> {
  return post("/api/kit", payload);
}

export function fetchLibrary(q: string, tag: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (tag && tag !== "All") params.set("tag", tag);
  return get<{ items: LibraryItem[]; total: number; demo?: boolean }>(
    `/api/library?${params.toString()}`
  );
}

export function fetchRuns() {
  return get<{ rows: RunRow[]; demo?: boolean }>("/api/runs");
}

export function fetchHealth() {
  return get<{
    cloudName: string | null;
    folder: string;
    demoMode: boolean;
    credentials: boolean;
    ping: boolean;
    usage: { credits?: number; plan?: string } | null;
    imageGenBase: string;
    message: string;
  }>("/api/health");
}

export async function uploadSource(
  file: File,
  runId: string,
  kind: "source" | "logo" = "source"
) {
  const form = new FormData();
  form.append("file", file);
  form.append("runId", runId);
  form.append("kind", kind);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Upload failed");
  return json as {
    kind: "source" | "logo";
    publicId: string;
    url: string;
    thumbUrl: string;
    width: number;
    height: number;
    bytes: number;
    format: string;
    originalBytes: number;
    qualityScore: number | null;
  };
}

export function refreshVision(publicId: string, url: string, prompt: string) {
  return post<{ caption: string; tags: string[]; safe: boolean }>("/api/vision", {
    publicId,
    url,
    prompt,
  });
}
