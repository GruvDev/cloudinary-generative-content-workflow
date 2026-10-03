"use client";

import { useEffect, useState } from "react";
import { fetchLibrary } from "@/lib/client";
import type { LibraryItem } from "@/lib/types";
import { chipStyle, formatBytes, mono, muted, timeAgo } from "@/lib/ui";
import { Search } from "./icons";

const CHIPS = ["All", "flux", "ideogram", "recraft", "nano-banana", "source"];

export default function LibraryScreen({ reloadKey }: { reloadKey: number }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("All");
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Debounce so typing does not hammer the Search API.
    const timer = setTimeout(() => {
      fetchLibrary(query, tag)
        .then((res) => {
          if (cancelled) return;
          setItems(res.items);
          setTotal(res.total);
        })
        .catch((err: Error) => !cancelled && setError(err.message))
        .finally(() => !cancelled && setLoading(false));
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, tag, reloadKey]);

  return (
    <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <div style={{ marginRight: "auto" }}>
          <h6 style={{ color: "var(--color-accent)", margin: "0 0 6px" }}>Library</h6>
          <h2 style={{ margin: 0 }}>Every asset, tagged by AI Vision, searchable by meaning.</h2>
        </div>
        <span style={{ fontSize: 12, fontFamily: mono, color: muted(60) }}>
          {loading ? "searching…" : `${items.length} of ${total} assets`}
        </span>
      </div>

      <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <input
            className="input"
            style={{ paddingLeft: 34 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search by what's in the image — "shoe on slate, soft light"`}
            aria-label="Search the library"
          />
          <Search style={{ position: "absolute", left: 11, top: 11, opacity: 0.5 }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {CHIPS.map((c) => (
            <button key={c} type="button" onClick={() => setTag(c)} style={chipStyle(tag === c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <hr className="hr" style={{ margin: 0 }} />

      <p style={{ fontSize: 11, color: muted(55), margin: 0 }}>
        Served by the Cloudinary Search API. There is no database in this project — the free-text box
        queries the AI Vision captions and tags written onto each asset at generation time.
      </p>

      {error && (
        <div style={{ border: "1px solid var(--color-accent)", padding: "var(--space-3)", fontSize: 13 }}>
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 190px), 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {loading
          ? Array.from({ length: 8 }, (_, i) => (
              <div key={i} style={{ border: "1px solid var(--color-divider)" }}>
                <div className="kiln-skeleton" style={{ aspectRatio: "4/3" }} />
                <div style={{ padding: "var(--space-3)" }}>
                  <div className="kiln-skeleton" style={{ height: 10, marginBottom: 8 }} />
                  <div className="kiln-skeleton" style={{ height: 10, width: "60%" }} />
                </div>
              </div>
            ))
          : items.map((a) => (
              <figure key={a.publicId} style={{ border: "1px solid var(--color-divider)" }} className="kiln-rise">
                <div style={{ position: "relative", aspectRatio: "4/3", overflow: "hidden", background: "var(--color-surface)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.thumbUrl}
                    alt={a.caption ?? a.publicId}
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      background: "var(--color-bg)",
                      fontSize: 10,
                      padding: "3px 7px",
                      fontFamily: mono,
                    }}
                  >
                    {a.format}
                  </span>
                </div>
                <figcaption
                  style={{
                    padding: "10px var(--space-3) var(--space-3)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 7,
                    marginTop: 0,
                  }}
                >
                  <div style={{ fontFamily: mono, fontSize: 11, wordBreak: "break-all" }}>{a.publicId}</div>
                  {a.caption && (
                    <div style={{ fontSize: 11, color: muted(62), lineHeight: 1.4 }}>
                      {a.caption.slice(0, 90)}
                    </div>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {a.tags.slice(0, 3).map((t) => (
                      <span key={t} className="tag tag-accent" style={{ fontSize: 10, padding: "2px 7px" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 10,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: muted(50),
                    }}
                  >
                    <span>{a.model}</span>
                    <span>
                      {formatBytes(a.bytes)} · {timeAgo(a.createdAt)}
                    </span>
                  </div>
                </figcaption>
              </figure>
            ))}
      </div>

      {!loading && items.length === 0 && !error && (
        <p style={{ fontSize: 13, color: muted(60) }}>
          No asset matches that description. AI Vision searches captions and tags — try &quot;studio&quot;,
          &quot;product&quot; or clear the search box.
        </p>
      )}
    </div>
  );
}
