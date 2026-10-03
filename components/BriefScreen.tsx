"use client";

import { useRef, useState } from "react";
import {
  ASPECT_DIMS,
  CHANNELS,
  MODELS,
  TONE_CHIPS,
  type Aspect,
  type Brief,
  type ModelFamily,
  type Strength,
} from "@/lib/types";
import {
  channelRowStyle,
  chipStyle,
  formatBytes,
  label12,
  modelCardStyle,
  mono,
  muted,
  segStyle,
} from "@/lib/ui";
import { Spark } from "./icons";

export interface SourceAsset {
  publicId: string;
  thumbUrl: string;
  bytes: number;
  originalBytes: number;
  width: number;
  height: number;
  format: string;
  qualityScore: number | null;
}

interface Props {
  brief: Brief;
  patch: (p: Partial<Brief>) => void;
  source: SourceAsset | null;
  uploading: boolean;
  uploadError: string | null;
  onUpload: (file: File) => void;
  onClearSource: () => void;
  onGenerate: () => void;
  running: boolean;
}

const STRENGTHS: Strength[] = ["Subtle", "Balanced", "Loose"];
const ASPECTS: Aspect[] = ["1:1", "4:5", "16:9"];
const COUNTS = [2, 4, 6, 8];

export default function BriefScreen({
  brief,
  patch,
  source,
  uploading,
  uploadError,
  onUpload,
  onClearSource,
  onGenerate,
  running,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const estCredits = brief.count * (brief.tier === "premium" ? 3 : 2);
  const estDerivatives = brief.channels.length;

  return (
    <div
      style={{
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <div style={{ marginRight: "auto" }}>
          <h6 style={{ color: "var(--color-accent)", margin: "0 0 6px" }}>Step 01 — Brief</h6>
          <h2 style={{ margin: 0 }}>Describe the campaign. The pipeline does the rest.</h2>
        </div>
        <span className="tag tag-neutral">
          {source ? "source uploaded" : "no source — text to image"}
        </span>
      </div>
      <hr className="hr" style={{ margin: 0 }} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: "var(--space-6)",
          alignItems: "start",
        }}
      >
        {/* ── left column ───────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className="field">
            <label htmlFor="campaign">Campaign name</label>
            <input
              id="campaign"
              className="input"
              value={brief.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="brief">Creative brief — this is sent to the model as the prompt</label>
            <textarea
              id="brief"
              className="input"
              style={{ minHeight: 132, lineHeight: 1.5 }}
              value={brief.brief}
              onChange={(e) => patch({ brief: e.target.value })}
            />
          </div>

          <div>
            <div style={label12}>Direction — appended as style modifiers</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {TONE_CHIPS.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => patch({ tones: toggle(brief.tones, tone) })}
                  style={chipStyle(brief.tones.includes(tone))}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={label12}>
              Source asset — uploaded to Cloudinary, then used as the generation base
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "stretch" }}>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) onUpload(file);
                }}
                onClick={() => fileInput.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && fileInput.current?.click()}
                style={{
                  width: 180,
                  height: 180,
                  flex: "none",
                  border: `1px solid ${dragging ? "var(--color-accent)" : "var(--color-divider)"}`,
                  background: dragging ? "var(--color-accent-100)" : "var(--color-surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {uploading ? (
                  <span style={{ fontSize: 12, color: muted(60) }}>Uploading…</span>
                ) : source ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={source.thumbUrl}
                    alt="Source product shot"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: 12, color: muted(55), textAlign: "center", padding: 12 }}>
                    Drop product shot
                    <br />
                    <span style={{ fontSize: 11 }}>optional</span>
                  </span>
                )}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                  e.target.value = "";
                }}
              />

              <div
                style={{
                  flex: 1,
                  minWidth: 200,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 12,
                  fontFamily: mono,
                  color: muted(72),
                }}
              >
                <Row k="public_id" v={source?.publicId ?? "—"} />
                <Row
                  k="bytes"
                  v={
                    source
                      ? `${formatBytes(source.originalBytes)} → ${formatBytes(source.bytes)}`
                      : "—"
                  }
                />
                <Row k="dimensions" v={source ? `${source.width}×${source.height}` : "—"} />
                <Row
                  k="quality_analysis"
                  v={source ? (source.qualityScore !== null ? `focus ${source.qualityScore}` : "ran") : "—"}
                />
                <Row k="mode" v={source ? "image → image" : "text → image"} last />
                {uploadError && (
                  <span style={{ color: "var(--color-accent-700)", fontSize: 11 }}>{uploadError}</span>
                )}
                {source && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={onClearSource}
                    style={{ alignSelf: "flex-start", paddingInline: 0, fontSize: 12 }}
                  >
                    Remove source
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <div style={label12}>Channel kit — derivatives built in the same request</div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                borderTop: "1px solid var(--color-divider)",
              }}
            >
              {CHANNELS.map((ch) => {
                const active = brief.channels.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => patch({ channels: toggle(brief.channels, ch.id) })}
                    style={channelRowStyle(active)}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        flex: "none",
                        border: "1px solid var(--color-divider)",
                        background: active ? "var(--color-accent)" : "transparent",
                      }}
                    />
                    <span style={{ fontSize: 13 }}>{ch.label}</span>
                    <span style={{ marginLeft: "auto", fontSize: 11, fontFamily: mono, color: muted(55) }}>
                      {ch.width}×{ch.height}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── right column ──────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div>
            <div style={label12}>Model — one API, five model families</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
                gap: "var(--space-2)",
              }}
            >
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => patch({ model: m.id as ModelFamily })}
                  style={modelCardStyle(brief.model === m.id)}
                >
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 14 }}>
                    {m.name}
                  </span>
                  <span style={{ fontSize: 11, color: muted(55) }}>{m.vendor}</span>
                  <span style={{ fontSize: 11, fontFamily: mono, marginTop: 4 }}>{m.note}</span>
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
              gap: "var(--space-4)",
            }}
          >
            <div>
              <div style={label12}>Variations</div>
              <div style={{ display: "flex", flexWrap: "wrap", border: "1px solid var(--color-divider)" }}>
                {COUNTS.map((n) => (
                  <button key={n} type="button" onClick={() => patch({ count: n })} style={segStyle(brief.count === n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={label12}>Quality tier</div>
              <div style={{ display: "flex", flexWrap: "wrap", border: "1px solid var(--color-divider)" }}>
                {(["standard", "premium"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => patch({ tier: t })} style={segStyle(brief.tier === t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={label12}>Deviation from source</div>
              <div style={{ display: "flex", flexWrap: "wrap", border: "1px solid var(--color-divider)" }}>
                {STRENGTHS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patch({ strength: s })}
                    style={{ ...segStyle(brief.strength === s), opacity: source ? 1 : 0.5 }}
                    disabled={!source}
                    title={source ? undefined : "Upload a source image to use this"}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={label12}>Base aspect</div>
              <div style={{ display: "flex", flexWrap: "wrap", border: "1px solid var(--color-divider)" }}>
                {ASPECTS.map((a) => (
                  <button key={a} type="button" onClick={() => patch({ aspect: a })} style={segStyle(brief.aspect === a)}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="seed">Seed — lock to keep a look across runs</label>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <input
                  id="seed"
                  className="input"
                  style={{ fontFamily: mono }}
                  value={brief.seed}
                  onChange={(e) => patch({ seed: e.target.value.replace(/\D/g, "").slice(0, 9) })}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => patch({ seedLock: !brief.seedLock })}
                  style={{ flex: "none" }}
                >
                  {brief.seedLock ? "Locked" : "Random"}
                </button>
              </div>
            </div>
          </div>

          <hr className="hr" style={{ margin: 0 }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <Meta k="base resolution" v={`${ASPECT_DIMS[brief.aspect].width}×${ASPECT_DIMS[brief.aspect].height}`} />
            <Meta k="estimated cost" v={`${estCredits} credits`} />
            <Meta k="derivatives per pick" v={`${estDerivatives} files`} />
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={onGenerate}
              disabled={running || !brief.brief.trim()}
              style={{ padding: "12px var(--space-4)", fontSize: 15, gap: 10, opacity: running ? 0.6 : 1 }}
            >
              <Spark />
              {running ? "Running pipeline…" : `Generate ${brief.count} variations`}
            </button>
            <p style={{ fontSize: 11, color: muted(55), margin: 0 }}>
              Runs as one pipeline: upload → generate → variations → AI Vision → named transformation →
              CDN delivery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        borderBottom: last ? "none" : "1px solid var(--color-divider)",
        paddingBottom: last ? 0 : 5,
      }}
    >
      <span>{k}</span>
      <span style={{ textAlign: "right", wordBreak: "break-all" }}>{v}</span>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 12,
        fontFamily: mono,
        color: muted(70),
      }}
    >
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}
