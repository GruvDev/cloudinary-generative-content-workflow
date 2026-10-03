"use client";

import type { PipelineStep } from "@/lib/types";
import { formatMs, label10, mono, muted } from "@/lib/ui";

interface Props {
  steps: PipelineStep[];
  statusText: string;
  running: boolean;
  lastResponse: string;
  onCopyResponse: () => void;
  width: number;
}

export default function PipelineRail({
  steps,
  statusText,
  running,
  lastResponse,
  onCopyResponse,
  width,
}: Props) {
  const anyError = steps.some((s) => s.state === "error");
  const statusDot = anyError ? "var(--color-accent-700)" : running ? "var(--color-accent)" : "var(--color-neutral-500)";

  return (
    <aside
      style={{
        width,
        flex: "none",
        borderLeft: "2px solid var(--color-divider)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: "var(--space-4)",
          borderBottom: "2px solid var(--color-divider)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            background: statusDot,
            animation: running ? "kilnpulse 1s infinite" : "none",
            flex: "none",
          }}
        />
        <h5 style={{ margin: 0 }}>Cloudinary pipeline</h5>
        <span style={{ marginLeft: "auto", fontSize: 11, fontFamily: mono, color: muted(60) }}>
          {statusText}
        </span>
      </div>

      <div
        className="kiln-scroll"
        style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
      >
        {steps.map((s, i) => {
          const done = s.state === "done";
          const active = s.state === "running";
          const error = s.state === "error";
          const dotBorder = error
            ? "var(--color-accent-700)"
            : done || active
              ? "var(--color-accent)"
              : "var(--color-divider)";
          const dotFill = error
            ? "var(--color-accent-700)"
            : done
              ? "var(--color-accent)"
              : "transparent";

          return (
            <div key={s.key} style={{ display: "flex", gap: "var(--space-3)", paddingBottom: "var(--space-4)" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "none", width: 18 }}>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    border: `2px solid ${dotBorder}`,
                    background: dotFill,
                    flex: "none",
                    animation: active ? "kilnpulse 1s infinite" : "none",
                  }}
                />
                {i < steps.length - 1 && (
                  <span
                    style={{
                      flex: 1,
                      width: 2,
                      background: done ? "var(--color-accent)" : "var(--color-divider)",
                      marginTop: 4,
                      minHeight: 22,
                    }}
                  />
                )}
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  opacity: s.state === "idle" ? 0.45 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 13 }}>
                    {s.label}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 10, fontFamily: mono, color: muted(55) }}>
                    {s.ms !== undefined ? formatMs(s.ms) : active ? "…" : ""}
                  </span>
                </div>
                <div style={{ fontFamily: mono, fontSize: 11, color: "var(--color-accent-700)", wordBreak: "break-all" }}>
                  {s.api}
                </div>
                <div style={{ fontSize: 11, color: muted(62) }}>{s.detail}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "auto",
          borderTop: "2px solid var(--color-divider)",
          padding: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        <div style={label10}>Last response</div>
        <pre
          style={{
            margin: 0,
            background: "var(--color-neutral-900)",
            color: "var(--color-neutral-200)",
            padding: "var(--space-3)",
            fontFamily: mono,
            fontSize: 11,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: 168,
            overflow: "auto",
          }}
        >
          {lastResponse || "// no call yet"}
        </pre>
        <button type="button" className="btn btn-secondary btn-block" onClick={onCopyResponse} style={{ justifyContent: "flex-start" }}>
          Copy response JSON
        </button>
      </div>
    </aside>
  );
}
