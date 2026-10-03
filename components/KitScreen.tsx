"use client";

import { useRef, useState } from "react";
import type { KitOutput, Variant } from "@/lib/types";
import { chipStyle, label12, mono, muted } from "@/lib/ui";
import { Copy, Download } from "./icons";

export interface LogoAsset {
  publicId: string;
  thumbUrl: string;
  format: string;
}

const DELIVERY_FLAGS = [
  { id: "f_auto", label: "f_auto" },
  { id: "q_auto", label: "q_auto" },
  { id: "g_auto", label: "g_auto" },
  { id: "dpr_auto", label: "dpr_auto" },
  { id: "e_sharpen", label: "e_sharpen" },
];

interface Props {
  picked: Variant | null;
  outputs: KitOutput[];
  snippets: { url: string; html: string; node: string } | null;
  namedTransformation: string | null;
  delivery: string[];
  setDelivery: (d: string[]) => void;
  headline: string;
  setHeadline: (h: string) => void;
  brandColor: string;
  setBrandColor: (c: string) => void;
  scrim: boolean;
  setScrim: (s: boolean) => void;
  logo: LogoAsset | null;
  logoUploading: boolean;
  logoError: string | null;
  onUploadLogo: (file: File) => void;
  onClearLogo: () => void;
  building: boolean;
  onCopy: (text: string, label: string) => void;
}

export default function KitScreen({
  picked,
  outputs,
  snippets,
  namedTransformation,
  delivery,
  setDelivery,
  headline,
  setHeadline,
  brandColor,
  setBrandColor,
  scrim,
  setScrim,
  logo,
  logoUploading,
  logoError,
  onUploadLogo,
  onClearLogo,
  building,
  onCopy,
}: Props) {
  const [tab, setTab] = useState<"url" | "html" | "node">("url");
  const logoInput = useRef<HTMLInputElement>(null);
  const [logoDrag, setLogoDrag] = useState(false);

  if (!picked) {
    return (
      <div style={{ padding: "var(--space-6)" }}>
        <h6 style={{ color: "var(--color-accent)", margin: "0 0 6px" }}>Step 03 — Channel kit</h6>
        <h2 style={{ margin: "0 0 var(--space-3)" }}>Pick a variation first.</h2>
        <p style={{ color: muted(60), fontSize: 13 }}>
          Go back to Variations and pick the winner. Every channel size below is derived from that one
          asset.
        </p>
      </div>
    );
  }

  const toggleFlag = (id: string) =>
    setDelivery(delivery.includes(id) ? delivery.filter((d) => d !== id) : [...delivery, id]);

  return (
    <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <div style={{ marginRight: "auto" }}>
          <h6 style={{ color: "var(--color-accent)", margin: "0 0 6px" }}>Step 03 — Channel kit</h6>
          <h2 style={{ margin: 0 }}>One winner, every channel, one named transformation.</h2>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onCopy(outputs.map((o) => o.url).join("\n"), "All URLs copied")}
          style={{ gap: 8, whiteSpace: "nowrap" }}
        >
          <Copy />
          Copy all URLs
        </button>
      </div>
      <hr className="hr" style={{ margin: 0 }} />

      <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ width: 180, flex: "none" }}>
          <div style={{ aspectRatio: "1", border: "1px solid var(--color-divider)", overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={picked.thumbUrl}
              alt={picked.vision?.caption ?? "Chosen variation"}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div style={{ fontSize: 11, fontFamily: mono, marginTop: 8, color: muted(65), wordBreak: "break-all" }}>
            {picked.publicId}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 260, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div>
            <div style={label12}>Global delivery options — applied to every derivative</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {DELIVERY_FLAGS.map((f) => (
                <button key={f.id} type="button" onClick={() => toggleFlag(f.id)} style={chipStyle(delivery.includes(f.id))}>
                  {f.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setScrim(!scrim)}
                style={chipStyle(scrim)}
                title="Solid box behind the headline, so it stays readable on a busy image"
              >
                text box
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
              gap: "var(--space-3)",
            }}
          >
            <div className="field">
              <label htmlFor="headline">Headline — burned in as a Cloudinary text layer</label>
              <input
                id="headline"
                className="input"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Leave empty for a clean image"
                maxLength={48}
              />
            </div>
            <div className="field">
              <label htmlFor="brand">Headline colour</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="brand"
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  style={{ width: 44, height: 38, padding: 0, border: "1px solid var(--color-divider)", background: "none", cursor: "pointer" }}
                />
                <input
                  className="input"
                  style={{ fontFamily: mono }}
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label>Logo — overlaid as a Cloudinary image layer</label>
              <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setLogoDrag(true);
                  }}
                  onDragLeave={() => setLogoDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setLogoDrag(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) onUploadLogo(file);
                  }}
                  onClick={() => logoInput.current?.click()}
                  onKeyDown={(e) => e.key === "Enter" && logoInput.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload a logo"
                  style={{
                    width: 56,
                    height: 38,
                    flex: "none",
                    border: `1px solid ${logoDrag ? "var(--color-accent)" : "var(--color-divider)"}`,
                    background: logoDrag ? "var(--color-accent-100)" : "var(--color-surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    overflow: "hidden",
                  }}
                >
                  {logoUploading ? (
                    <span style={{ fontSize: 10, color: muted(60) }}>…</span>
                  ) : logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo.thumbUrl}
                      alt="Logo"
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <span style={{ fontSize: 10, color: muted(55) }}>drop</span>
                  )}
                </div>
                <input
                  ref={logoInput}
                  type="file"
                  accept="image/png,image/svg+xml,image/webp,image/jpeg"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUploadLogo(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => (logo ? onClearLogo() : logoInput.current?.click())}
                  style={{ flex: 1, fontSize: 12 }}
                >
                  {logo ? "Remove logo" : "Upload PNG"}
                </button>
              </div>
              {logoError && (
                <span style={{ color: "var(--color-accent-700)", fontSize: 11 }}>{logoError}</span>
              )}
            </div>
          </div>

          <p style={{ fontSize: 11, color: muted(55), margin: 0 }}>
            Nothing is regenerated when you change these. Each option rebuilds a URL string, and
            Cloudinary renders the derivative on first request.
            {namedTransformation && (
              <>
                {" "}
                Registered on your account as{" "}
                <code style={{ fontFamily: mono }}>t_{namedTransformation}</code>.
              </>
            )}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
          gap: "var(--space-4)",
          marginTop: "var(--space-2)",
          opacity: building ? 0.55 : 1,
          transition: "opacity 150ms ease-out",
        }}
      >
        {outputs.map((o) => (
          <div key={o.id} style={{ border: "1px solid var(--color-divider)", display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px var(--space-3)",
                borderBottom: "1px solid var(--color-divider)",
              }}
            >
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 14 }}>{o.name}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, fontFamily: mono, color: muted(55) }}>
                {o.width}×{o.height}
              </span>
            </div>

            <div style={{ padding: "var(--space-3)", display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
              <div
                style={{
                  width: 86,
                  flex: "none",
                  aspectRatio: `${o.width} / ${o.height}`,
                  border: "1px solid var(--color-divider)",
                  overflow: "hidden",
                  background: "var(--color-surface)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={o.url}
                  alt={`${o.name} derivative`}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 11, color: muted(60) }}>{o.use}</div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 11,
                    lineHeight: 1.55,
                    wordBreak: "break-all",
                    background: "var(--color-surface)",
                    padding: "6px 8px",
                    maxHeight: 92,
                    overflow: "auto",
                  }}
                >
                  {o.transform.split("/").map((step, i) => (
                    <div key={i}>{step}</div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => onCopy(o.url, `${o.name} URL copied`)} style={{ fontSize: 12, paddingInline: 0 }}>
                    Copy URL
                  </button>
                  <a
                    className="btn btn-ghost"
                    href={o.downloadUrl}
                    style={{ fontSize: 12, paddingInline: 0, gap: 5 }}
                  >
                    <Download /> Download
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {snippets && (
        <div style={{ marginTop: "var(--space-2)" }}>
          <div style={{ display: "flex", gap: 0, border: "1px solid var(--color-divider)", width: "max-content" }}>
            {(["url", "html", "node"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                style={{
                  padding: "7px 14px",
                  fontSize: 12,
                  fontFamily: mono,
                  border: 0,
                  cursor: "pointer",
                  background: tab === t ? "var(--color-text)" : "transparent",
                  color: tab === t ? "var(--color-bg)" : "var(--color-text)",
                }}
              >
                {t}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onCopy(snippets[tab], "Snippet copied")}
              style={{
                padding: "7px 14px",
                fontSize: 12,
                fontFamily: mono,
                border: 0,
                borderLeft: "1px solid var(--color-divider)",
                cursor: "pointer",
                background: "transparent",
                color: "var(--color-text)",
              }}
            >
              copy
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              background: "var(--color-neutral-900)",
              color: "var(--color-neutral-200)",
              padding: "var(--space-4)",
              fontFamily: mono,
              fontSize: 12,
              lineHeight: 1.7,
              overflow: "auto",
              maxHeight: 320,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {snippets[tab]}
          </pre>
        </div>
      )}
    </div>
  );
}
