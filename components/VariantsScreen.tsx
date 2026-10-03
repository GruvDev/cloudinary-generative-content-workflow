"use client";

import type { Brief, Variant } from "@/lib/types";
import { formatBytes, formatMs, mono, muted } from "@/lib/ui";
import { Arrow, Refresh, Search } from "./icons";

interface Props {
  brief: Brief;
  runId: string;
  variants: Variant[];
  picked: number | null;
  onPick: (index: number) => void;
  onVary: (index: number) => void;
  onInspect: (index: number) => void;
  onRegenAll: () => void;
  goKit: () => void;
  running: boolean;
}

export default function VariantsScreen({
  brief,
  runId,
  variants,
  picked,
  onPick,
  onVary,
  onInspect,
  onRegenAll,
  goKit,
  running,
}: Props) {
  const done = variants.filter((v) => v.status === "done").length;

  return (
    <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <div style={{ marginRight: "auto" }}>
          <h6 style={{ color: "var(--color-accent)", margin: "0 0 6px" }}>Step 02 — Variations</h6>
          <h2 style={{ margin: 0 }}>{brief.name || "Untitled campaign"}</h2>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onRegenAll} disabled={running} style={{ gap: 8, whiteSpace: "nowrap" }}>
          <Refresh />
          Regenerate set
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={goKit}
          disabled={picked === null}
          style={{ gap: 8, whiteSpace: "nowrap", opacity: picked === null ? 0.5 : 1 }}
        >
          Build channel kit
          <Arrow />
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "var(--space-4)",
          flexWrap: "wrap",
          fontSize: 11,
          fontFamily: mono,
          color: muted(60),
          borderTop: "1px solid var(--color-divider)",
          borderBottom: "1px solid var(--color-divider)",
          padding: "8px 0",
        }}
      >
        <span>run {runId}</span>
        <span>model {brief.model}</span>
        <span>tier {brief.tier}</span>
        <span>seed {brief.seedLock ? brief.seed : "random"}</span>
        <span>
          {done}/{variants.length} ready
        </span>
        <span>{variants.some((v) => v.vision) ? "vision tagged" : "vision pending"}</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 210px), 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {variants.map((v) => (
          <VariantCard
            key={v.index}
            v={v}
            picked={picked === v.index}
            onPick={() => onPick(v.index)}
            onVary={() => onVary(v.index)}
            onInspect={() => onInspect(v.index)}
          />
        ))}
      </div>
    </div>
  );
}

function VariantCard({
  v,
  picked,
  onPick,
  onVary,
  onInspect,
}: {
  v: Variant;
  picked: boolean;
  onPick: () => void;
  onVary: () => void;
  onInspect: () => void;
}) {
  const wrap: React.CSSProperties = {
    border: `1px solid ${picked ? "var(--color-accent)" : "var(--color-divider)"}`,
    outline: picked ? "2px solid var(--color-accent)" : "none",
    outlineOffset: -3,
    display: "flex",
    flexDirection: "column",
    background: "var(--color-bg)",
  };

  return (
    <div style={wrap} className={v.status === "done" ? "kiln-rise" : undefined}>
      <div
        style={{
          position: "relative",
          aspectRatio: "1",
          background: "var(--color-surface)",
          overflow: "hidden",
        }}
        className={v.status === "pending" ? "kiln-skeleton" : undefined}
      >
        {v.status === "done" && v.thumbUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={v.thumbUrl}
            alt={v.vision?.caption ?? `Variation ${v.index + 1}`}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}

        {v.status === "error" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 14,
              textAlign: "center",
              fontSize: 11,
              color: "var(--color-accent-700)",
            }}
          >
            {v.error?.slice(0, 160) || "Generation failed"}
          </div>
        )}

        <span
          style={{
            position: "absolute",
            left: 10,
            top: 6,
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            fontSize: 34,
            lineHeight: 1,
            color: "color-mix(in srgb, #201e1d 28%, transparent)",
            mixBlendMode: "multiply",
          }}
        >
          {String(v.index + 1).padStart(2, "0")}
        </span>

        {v.status === "done" && (
          <span
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              background: "var(--color-bg)",
              fontSize: 10,
              letterSpacing: "0.08em",
              padding: "3px 7px",
              fontFamily: mono,
            }}
          >
            {v.width}×{v.height}
          </span>
        )}

        {v.status === "pending" && (
          <span
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 3,
              overflow: "hidden",
              background: "var(--color-divider)",
            }}
          >
            <span
              style={{
                display: "block",
                width: "40%",
                height: "100%",
                background: "var(--color-accent)",
                animation: "kilnbar 1.1s linear infinite",
              }}
            />
          </span>
        )}
      </div>

      <div
        style={{
          padding: "10px var(--space-3) var(--space-3)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 14 }}>
            {v.model ?? "—"}
          </span>
          <span style={{ marginLeft: "auto", fontSize: 11, fontFamily: mono, color: muted(55) }}>
            {v.status === "pending" ? "generating…" : formatMs(v.ms)}
          </span>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: 11,
            lineHeight: 1.45,
            color: muted(65),
            minHeight: 32,
          }}
        >
          {v.status === "pending"
            ? "Waiting on the model…"
            : v.vision?.caption ?? "No caption"}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, minHeight: 20 }}>
          {v.vision?.tags.slice(0, 4).map((t) => (
            <span key={t} className="tag tag-neutral" style={{ fontSize: 10, padding: "2px 7px" }}>
              {t}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
          <button
            type="button"
            className={picked ? "btn btn-primary" : "btn btn-secondary"}
            onClick={onPick}
            disabled={v.status !== "done"}
            style={{ flex: 1, padding: "6px 9px", fontSize: 12, opacity: v.status === "done" ? 1 : 0.4 }}
          >
            {picked ? "Picked" : "Pick"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onVary}
            disabled={v.status === "pending"}
            style={{ padding: "6px 9px" }}
            title="More like this"
            aria-label="More like this"
          >
            <Refresh />
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onInspect}
            disabled={v.status !== "done"}
            style={{ padding: "6px 9px" }}
            title="Re-run AI Vision"
            aria-label="Re-run AI Vision"
          >
            <Search />
          </button>
        </div>

        {v.bytes ? (
          <span style={{ fontSize: 10, fontFamily: mono, color: muted(45) }}>
            {formatBytes(v.bytes)} · {v.publicId}
          </span>
        ) : null}
      </div>
    </div>
  );
}
