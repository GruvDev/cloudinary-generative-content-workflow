// Small shared style helpers, so the screens stay close to the original design
// without repeating long inline style strings.

import type { CSSProperties } from "react";

export const mono = "ui-monospace, Menlo, monospace";

export function muted(pct: number): string {
  return `color-mix(in srgb, var(--color-text) ${pct}%, transparent)`;
}

export const label10: CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: muted(45),
};

export const label12: CSSProperties = {
  fontSize: 12,
  color: muted(70),
  marginBottom: 8,
};

export const monoSmall: CSSProperties = {
  fontFamily: mono,
  fontSize: 11,
  color: muted(55),
};

/** The square chip used for tones, delivery flags and library filters. */
export function chipStyle(active: boolean): CSSProperties {
  return {
    padding: "6px 11px",
    cursor: "pointer",
    border: `1px solid ${active ? "var(--color-accent)" : "var(--color-divider)"}`,
    background: active ? "var(--color-accent)" : "transparent",
    color: active ? "#fff" : "var(--color-text)",
    fontFamily: "inherit",
    fontSize: 12,
    lineHeight: 1.3,
  };
}

/** Segmented option inside a bordered group. */
export function segStyle(active: boolean): CSSProperties {
  return {
    flex: "1 1 auto",
    padding: "7px 10px",
    fontSize: 12,
    fontFamily: mono,
    cursor: "pointer",
    border: 0,
    background: active ? "var(--color-text)" : "transparent",
    color: active ? "var(--color-bg)" : "var(--color-text)",
  };
}

export function modelCardStyle(active: boolean): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
    padding: "10px 12px",
    textAlign: "left",
    cursor: "pointer",
    font: "inherit",
    border: `1px solid ${active ? "var(--color-accent)" : "var(--color-divider)"}`,
    background: active ? "var(--color-accent-100)" : "transparent",
    color: "var(--color-text)",
    outline: active ? "1px solid var(--color-accent)" : "none",
  };
}

export function channelRowStyle(active: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "9px 4px",
    borderTop: 0,
    borderLeft: 0,
    borderRight: 0,
    borderBottom: "1px solid var(--color-divider)",
    background: "transparent",
    color: active ? "var(--color-text)" : muted(55),
    font: "inherit",
    cursor: "pointer",
    textAlign: "left",
  };
}

export function navBtnStyle(active: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "10px var(--space-4)",
    border: 0,
    borderLeft: `3px solid ${active ? "var(--color-accent)" : "transparent"}`,
    background: active ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
    color: active ? "var(--color-text)" : muted(70),
    font: "inherit",
    fontSize: 14,
    cursor: "pointer",
    textAlign: "left",
  };
}

export function formatBytes(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatMs(ms?: number): string {
  if (!ms && ms !== 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
