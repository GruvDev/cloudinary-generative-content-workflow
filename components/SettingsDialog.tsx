"use client";

import { useState } from "react";
import { fetchHealth } from "@/lib/client";
import { mono, muted } from "@/lib/ui";

interface Health {
  cloudName: string | null;
  folder: string;
  demoMode: boolean;
  credentials: boolean;
  ping: boolean;
  usage: { credits?: number; plan?: string } | null;
  imageGenBase: string;
  message: string;
}

export default function SettingsDialog({
  health,
  onClose,
  onHealth,
}: {
  health: Health | null;
  onClose: () => void;
  onHealth: (h: Health) => void;
}) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const test = async () => {
    setTesting(true);
    setResult(null);
    try {
      const h = await fetchHealth();
      onHealth(h);
      setResult(h.message);
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="dialog"
        style={{ width: "min(560px, 100%)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Cloudinary connection"
      >
        <div className="dialog-title">Cloudinary connection</div>
        <div className="dialog-body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <Field label="Cloud name" value={health?.cloudName || "not configured"} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <Field label="Asset folder" value={health?.folder || "kiln"} />
            <Field label="Named transformation" value="t_kiln_social_kit" />
          </div>
          <Field label="Image Generation base" value={health?.imageGenBase || "—"} />
          <Field
            label="Credentials"
            value={
              health?.credentials
                ? "API key and secret loaded (server-side only)"
                : "missing — running on sample assets"
            }
          />
          {health?.usage?.credits !== undefined && (
            <Field label="Credits remaining" value={String(health.usage.credits)} />
          )}

          <div
            style={{
              border: "1px solid var(--color-divider)",
              padding: "var(--space-3)",
              fontSize: 12,
              lineHeight: 1.6,
              background: "var(--color-surface)",
            }}
          >
            <strong style={{ display: "block", marginBottom: 4 }}>Status</strong>
            <span style={{ color: muted(75) }}>
              {result ?? health?.message ?? "Not tested yet."}
            </span>
          </div>

          <p style={{ fontSize: 11, color: muted(55), margin: 0 }}>
            The API secret never leaves the server. Uploads are posted to this app&apos;s own route,
            signed there, and forwarded to Cloudinary. Set values in <code style={{ fontFamily: mono }}>.env.local</code>,
            or in Vercel project settings for the deployed app.
          </p>
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-primary" onClick={test} disabled={testing}>
            {testing ? "Testing…" : "Test connection"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input className="input" style={{ fontFamily: mono }} value={value} readOnly />
    </div>
  );
}
