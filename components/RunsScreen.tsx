"use client";

import { useEffect, useState } from "react";
import { fetchRuns } from "@/lib/client";
import type { RunRow } from "@/lib/types";
import { formatMs, mono, muted, timeAgo } from "@/lib/ui";

export default function RunsScreen({ reloadKey }: { reloadKey: number }) {
  const [rows, setRows] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRuns()
      .then((res) => !cancelled && setRows(res.rows))
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const tagClass = (status: RunRow["status"]) =>
    status === "complete" ? "tag tag-accent" : status === "partial" ? "tag tag-outline" : "tag tag-neutral";

  return (
    <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div>
        <h6 style={{ color: "var(--color-accent)", margin: "0 0 6px" }}>Runs</h6>
        <h2 style={{ margin: 0 }}>Pipeline history</h2>
      </div>
      <hr className="hr" style={{ margin: 0 }} />

      <p style={{ fontSize: 11, color: muted(55), margin: 0 }}>
        Rebuilt from Cloudinary. Each generated asset stores its run id in context metadata; this table
        groups them back into runs.
      </p>

      {error && (
        <div style={{ border: "1px solid var(--color-accent)", padding: "var(--space-3)", fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              <th>Run</th>
              <th>Campaign</th>
              <th>Model</th>
              <th>Variations</th>
              <th>Derivatives</th>
              <th>Duration</th>
              <th>Credits</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} style={{ color: muted(55), fontSize: 13 }}>
                  Loading run history…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: muted(55), fontSize: 13 }}>
                  No runs yet. Generate a set on the Brief screen and it will appear here.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ fontFamily: mono, fontSize: 12 }}>{r.id}</td>
                <td>{r.brief}</td>
                <td style={{ fontFamily: mono, fontSize: 12 }}>{r.model}</td>
                <td>{r.variants}</td>
                <td>{r.derivatives}</td>
                <td style={{ fontFamily: mono, fontSize: 12 }}>{formatMs(r.durationMs)}</td>
                <td>{r.credits}</td>
                <td>
                  <span className={tagClass(r.status)} style={{ fontSize: 10 }}>
                    {r.status}
                  </span>
                  <span style={{ marginLeft: 8, fontSize: 10, color: muted(45) }}>{timeAgo(r.createdAt)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
