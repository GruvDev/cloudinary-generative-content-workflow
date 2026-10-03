"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BriefScreen, { type SourceAsset } from "./BriefScreen";
import VariantsScreen from "./VariantsScreen";
import KitScreen, { type LogoAsset } from "./KitScreen";
import LibraryScreen from "./LibraryScreen";
import RunsScreen from "./RunsScreen";
import PipelineRail from "./PipelineRail";
import SettingsDialog from "./SettingsDialog";
import { DocIcon, Gear, GridIcon, KitIcon, LibraryIcon, RunsIcon, Spark } from "./icons";
import {
  buildKitRequest,
  fetchHealth,
  generateVariation,
  refreshVision,
  uploadSource,
} from "@/lib/client";
import type { Brief, KitOutput, PipelineStep, Variant } from "@/lib/types";
import { label10, mono, muted, navBtnStyle } from "@/lib/ui";

type View = "brief" | "variants" | "kit" | "library" | "runs";

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

const DEFAULT_BRIEF: Brief = {
  name: "A/W26 Trail Series — Launch Kit",
  brief:
    "Hero image of a trail running shoe on a slate plinth, hard single-source studio light from the upper left, deep shadow, matte grey seamless backdrop. No props, no models.",
  tones: ["Editorial", "High-contrast"],
  model: "flux",
  tier: "standard",
  count: 4,
  strength: "Balanced",
  aspect: "1:1",
  seed: "48219",
  seedLock: true,
  channels: ["ig", "story", "x", "email"],
};

function baseSteps(): PipelineStep[] {
  return [
    {
      key: "upload",
      label: "Upload source",
      api: "POST /api/upload → uploader.upload",
      detail: "Signed server-side upload with quality analysis",
      state: "idle",
    },
    {
      key: "generate",
      label: "Generate",
      api: "POST /v2/generate/{cloud}/text_to_image",
      detail: "Model family + tier, saved as a managed asset",
      state: "idle",
    },
    {
      key: "variations",
      label: "Variations",
      api: "N parallel calls, one asset each",
      detail: "Each variation is its own short function invocation",
      state: "idle",
    },
    {
      key: "vision",
      label: "AI Vision",
      api: "analyze → uploader.explicit",
      detail: "Caption + tags written back onto every asset",
      state: "idle",
    },
    {
      key: "transform",
      label: "Named transformation",
      api: "api.create_transformation",
      detail: "t_kiln_social_kit registered on the account",
      state: "idle",
    },
    {
      key: "deliver",
      label: "Delivery",
      api: "res.cloudinary.com/.../f_auto,q_auto",
      detail: "Every channel size served from the CDN",
      state: "idle",
    },
  ];
}

export default function Studio() {
  const [view, setView] = useState<View>("brief");
  const [brief, setBrief] = useState<Brief>(DEFAULT_BRIEF);
  const [runId, setRunId] = useState("run_000000");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  const [source, setSource] = useState<SourceAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [steps, setSteps] = useState<PipelineStep[]>(baseSteps);
  const [lastResponse, setLastResponse] = useState("");
  const [railOpen, setRailOpen] = useState(true);
  const [railWidth, setRailWidth] = useState(320);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [toast, setToast] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Channel kit state
  const [outputs, setOutputs] = useState<KitOutput[]>([]);
  const [snippets, setSnippets] = useState<{ url: string; html: string; node: string } | null>(null);
  const [namedTransformation, setNamedTransformation] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<string[]>(["f_auto", "q_auto", "g_auto"]);
  const [headline, setHeadline] = useState("");
  const [brandColor, setBrandColor] = useState("#ffffff");
  const [scrim, setScrim] = useState(true);
  const [buildingKit, setBuildingKit] = useState(false);
  const [logo, setLogo] = useState<LogoAsset | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3200);
  }, []);

  const patchBrief = useCallback((p: Partial<Brief>) => setBrief((b) => ({ ...b, ...p })), []);

  const setStep = useCallback((key: string, patch: Partial<PipelineStep>) => {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }, []);

  // Narrow viewports lose the rail so the main column stays usable.
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setRailWidth(w < 1400 ? 280 : 340);
      if (w < 1120) setRailOpen(false);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const copy = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        say(label);
      } catch {
        say("Could not copy — your browser blocked clipboard access");
      }
    },
    [say]
  );

  // ── upload ──────────────────────────────────────────────────────────────
  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadError(null);
      setStep("upload", { state: "running" });
      const started = Date.now();
      try {
        const res = await uploadSource(file, runId === "run_000000" ? "draft" : runId);
        setSource(res);
        setStep("upload", { state: "done", ms: Date.now() - started });
        setLastResponse(JSON.stringify(res, null, 2));
        say("Source uploaded and optimised by Cloudinary");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setUploadError(message);
        setStep("upload", { state: "error", ms: Date.now() - started });
        say(message);
      } finally {
        setUploading(false);
      }
    },
    [runId, say, setStep]
  );

  const handleLogoUpload = useCallback(
    async (file: File) => {
      setLogoUploading(true);
      setLogoError(null);
      try {
        const res = await uploadSource(file, runId === "run_000000" ? "draft" : runId, "logo");
        setLogo({ publicId: res.publicId, thumbUrl: res.thumbUrl, format: res.format });
        setLastResponse(JSON.stringify(res, null, 2));
        say("Logo uploaded — it is now a layer in every derivative");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Logo upload failed";
        setLogoError(message);
        say(message);
      } finally {
        setLogoUploading(false);
      }
    },
    [runId, say]
  );

  // ── generation ──────────────────────────────────────────────────────────
  const runGeneration = useCallback(async () => {
    if (!brief.brief.trim()) {
      say("Write a creative brief first");
      return;
    }

    const id = "run_" + Math.random().toString(16).slice(2, 8);
    const count = brief.count;
    const started = Date.now();

    setRunId(id);
    setRunning(true);
    setPicked(null);
    setOutputs([]);
    setSnippets(null);
    setView("variants");
    setSteps(
      baseSteps().map((s) =>
        s.key === "upload" && source ? { ...s, state: "done" } : s
      )
    );
    setStep("generate", { state: "running" });
    setStep("variations", { state: "running", detail: `0/${count} returned` });

    setVariants(
      Array.from({ length: count }, (_, i) => ({ index: i, status: "pending" as const }))
    );

    const payload: Brief = { ...brief, sourcePublicId: source?.publicId };
    let completed = 0;
    let firstOk = false;

    // One request per variation, all in flight at once. A single request that
    // generated every image in sequence would exceed the serverless timeout.
    const calls = Array.from({ length: count }, (_, index) =>
      generateVariation(payload, index, id)
        .then((variant) => {
          completed += 1;
          if (!firstOk) {
            firstOk = true;
            setStep("generate", { state: "done", ms: variant.ms });
            setStep("vision", { state: "running" });
          }
          setVariants((prev) => prev.map((v) => (v.index === index ? { ...variant, status: "done" } : v)));
          setStep("variations", { detail: `${completed}/${count} returned` });
          setLastResponse(JSON.stringify(variant, null, 2));
          return true;
        })
        .catch((err: Error & { payload?: Variant }) => {
          completed += 1;
          const message = err.message || "Generation failed";
          setVariants((prev) =>
            prev.map((v) => (v.index === index ? { ...v, status: "error", error: message } : v))
          );
          setStep("variations", { detail: `${completed}/${count} returned` });
          setLastResponse(JSON.stringify(err.payload ?? { error: message }, null, 2));
          return false;
        })
    );

    const results = await Promise.all(calls);
    const okCount = results.filter(Boolean).length;
    const totalMs = Date.now() - started;

    setStep("variations", {
      state: okCount ? "done" : "error",
      ms: totalMs,
      detail: `${okCount}/${count} succeeded`,
    });
    setStep("vision", {
      state: okCount ? "done" : "idle",
      detail: okCount ? "Captions and tags written onto each asset" : "Skipped",
    });
    if (!okCount) setStep("generate", { state: "error", ms: totalMs });

    setRunning(false);
    setReloadKey((k) => k + 1);

    if (okCount === 0) say("Every variation failed — open Connection to check the account");
    else if (okCount < count) say(`${okCount} of ${count} variations came back`);
    else say(`${count} variations ready in ${(totalMs / 1000).toFixed(1)}s`);

    // Auto-pick the first good one so the kit step is one click away.
    const firstGood = results.findIndex(Boolean);
    if (firstGood >= 0) setPicked(firstGood);
  }, [brief, source, say, setStep]);

  // ── single-variation re-roll ────────────────────────────────────────────
  const varyOne = useCallback(
    async (index: number) => {
      setVariants((prev) => prev.map((v) => (v.index === index ? { index, status: "pending" } : v)));
      const payload: Brief = {
        ...brief,
        sourcePublicId: source?.publicId,
        seedLock: false,
      };
      try {
        const variant = await generateVariation(payload, index, runId);
        setVariants((prev) => prev.map((v) => (v.index === index ? { ...variant, status: "done" } : v)));
        setLastResponse(JSON.stringify(variant, null, 2));
        say(`Variation ${index + 1} re-rolled`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Re-roll failed";
        setVariants((prev) =>
          prev.map((v) => (v.index === index ? { ...v, status: "error", error: message } : v))
        );
        say(message);
      }
    },
    [brief, runId, source, say]
  );

  const inspectOne = useCallback(
    async (index: number) => {
      const target = variants.find((v) => v.index === index);
      if (!target?.publicId || !target.url) return;
      say("Re-running AI Vision…");
      try {
        const vision = await refreshVision(target.publicId, target.url, brief.brief);
        setVariants((prev) => prev.map((v) => (v.index === index ? { ...v, vision } : v)));
        setLastResponse(JSON.stringify(vision, null, 2));
        say("Vision refreshed");
      } catch (err) {
        say(err instanceof Error ? err.message : "Vision failed");
      }
    },
    [variants, brief.brief, say]
  );

  // ── channel kit, rebuilt whenever an option changes ─────────────────────
  const pickedVariant = useMemo(
    () => (picked === null ? null : variants.find((v) => v.index === picked) ?? null),
    [picked, variants]
  );

  useEffect(() => {
    if (!pickedVariant?.publicId) {
      setOutputs([]);
      return;
    }
    let cancelled = false;
    setBuildingKit(true);
    setStep("transform", { state: "running" });

    const timer = setTimeout(() => {
      buildKitRequest({
        publicId: pickedVariant.publicId!,
        channels: brief.channels,
        delivery,
        headline,
        brandColor,
        logoPublicId: logo?.publicId,
        scrim,
        demo: pickedVariant.demo,
      })
        .then((res) => {
          if (cancelled) return;
          setOutputs(res.outputs);
          setSnippets(res.snippets);
          setNamedTransformation(res.namedTransformation);
          setStep("transform", {
            state: "done",
            detail: res.namedTransformation
              ? `t_${res.namedTransformation} registered`
              : "Transformation chain built",
          });
          setStep("deliver", {
            state: "done",
            detail: `${res.outputs.length} derivatives on the CDN`,
          });
        })
        .catch((err: Error) => {
          if (cancelled) return;
          setStep("transform", { state: "error" });
          say(err.message);
        })
        .finally(() => !cancelled && setBuildingKit(false));
    }, 260);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pickedVariant, brief.channels, delivery, headline, brandColor, logo, scrim, say, setStep]);

  // Two independent signals, so the warning still appears if /api/health fails:
  // what the server reported, and whether any returned asset is a demo asset.
  const demoMode = Boolean(health?.demoMode) || variants.some((v) => v.demo);

  const statusText = running
    ? "running"
    : variants.some((v) => v.status === "error")
      ? "partial"
      : variants.length
        ? "idle"
        : "ready";

  const navItems: { id: View; label: string; Icon: typeof DocIcon; badge?: string }[] = [
    { id: "brief", label: "Brief", Icon: DocIcon },
    { id: "variants", label: "Variations", Icon: GridIcon, badge: variants.length ? String(variants.length) : undefined },
    { id: "kit", label: "Channel kit", Icon: KitIcon, badge: outputs.length ? String(outputs.length) : undefined },
    { id: "library", label: "Library", Icon: LibraryIcon },
    { id: "runs", label: "Runs", Icon: RunsIcon },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-body)",
      }}
    >
      <header className="nav" style={{ gap: "var(--space-6)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: "auto" }}>
          <div style={{ width: 22, height: 22, background: "var(--color-accent)" }} />
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 19, letterSpacing: "-0.02em" }}>
            KILN
          </span>
          <span style={{ ...label10, marginLeft: 6, color: muted(50) }}>Generative asset studio</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 10px",
              border: "1px solid var(--color-divider)",
              fontSize: 12,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                background: health?.ping ? "var(--color-accent)" : "var(--color-neutral-500)",
              }}
            />
            <span style={{ fontFamily: mono, whiteSpace: "nowrap" }}>
              cloud: {health?.cloudName ?? (health ? "demo" : "…")}
            </span>
          </div>

          {demoMode && (
            <span className="tag tag-outline" style={{ fontSize: 10 }}>
              sample assets
            </span>
          )}

          <button type="button" className="btn btn-secondary" onClick={() => setSettingsOpen(true)} style={{ gap: 8, whiteSpace: "nowrap" }}>
            <Gear />
            Connection
          </button>
          <button type="button" className="btn btn-primary" onClick={runGeneration} disabled={running} style={{ gap: 8 }}>
            <Spark />
            {running ? "Running…" : "Generate"}
          </button>
        </div>
      </header>

      {demoMode && (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px var(--space-6)",
            background: "var(--color-accent-100)",
            borderBottom: "2px solid var(--color-accent)",
            fontSize: 12.5,
            lineHeight: 1.45,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              background: "var(--color-accent)",
              flex: "none",
            }}
          />
          <strong style={{ fontFamily: "var(--font-heading)" }}>Sample-asset mode.</strong>
          <span style={{ color: muted(80) }}>
            No Cloudinary credentials are set, so nothing is being generated — the images below come
            from Cloudinary&apos;s public <code style={{ fontFamily: mono }}>demo</code> cloud and
            will not match the brief. Every transformation and delivery URL on screen is still real.
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSettingsOpen(true)}
            style={{ marginLeft: "auto", fontSize: 12, whiteSpace: "nowrap" }}
          >
            How to connect
          </button>
        </div>
      )}

      <div style={{ display: "flex", flex: 1, minHeight: 0, alignItems: "stretch" }}>
        <nav
          style={{
            width: 196,
            flex: "none",
            borderRight: "2px solid var(--color-divider)",
            padding: "var(--space-4) 0",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <div style={{ ...label10, padding: "0 var(--space-4) var(--space-2)" }}>Workflow</div>

          {navItems.map(({ id, label, Icon, badge }) => (
            <button key={id} type="button" className="kiln-navbtn" onClick={() => setView(id)} style={navBtnStyle(view === id)}>
              <Icon />
              {label}
              {badge && (
                <span style={{ marginLeft: "auto", fontSize: 11, fontFamily: mono, color: muted(50) }}>{badge}</span>
              )}
            </button>
          ))}

          <hr className="hr" style={{ margin: "var(--space-4) 0" }} />
          <div style={{ padding: "0 var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <div style={label10}>This session</div>
            <Stat k="Generated" v={String(variants.filter((v) => v.status === "done").length)} />
            <Stat k="Derivatives" v={String(outputs.length)} />
            <Stat k="Delivery" v={delivery.includes("f_auto") ? "f_auto on" : "raw"} />
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setRailOpen((o) => !o)}
            style={{ margin: "var(--space-4) var(--space-4) 0", justifyContent: "flex-start", paddingInline: 0 }}
          >
            {railOpen ? "Hide pipeline" : "Show pipeline"}
          </button>
        </nav>

        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflowX: "auto" }}>
          {view === "brief" && (
            <BriefScreen
              brief={brief}
              patch={patchBrief}
              source={source}
              uploading={uploading}
              uploadError={uploadError}
              onUpload={handleUpload}
              onClearSource={() => setSource(null)}
              onGenerate={runGeneration}
              running={running}
            />
          )}

          {view === "variants" && (
            <VariantsScreen
              brief={brief}
              runId={runId}
              variants={variants}
              picked={picked}
              onPick={setPicked}
              onVary={varyOne}
              onInspect={inspectOne}
              onRegenAll={runGeneration}
              goKit={() => setView("kit")}
              running={running}
            />
          )}

          {view === "kit" && (
            <KitScreen
              picked={pickedVariant}
              outputs={outputs}
              snippets={snippets}
              namedTransformation={namedTransformation}
              delivery={delivery}
              setDelivery={setDelivery}
              headline={headline}
              setHeadline={setHeadline}
              brandColor={brandColor}
              setBrandColor={setBrandColor}
              scrim={scrim}
              setScrim={setScrim}
              logo={logo}
              logoUploading={logoUploading}
              logoError={logoError}
              onUploadLogo={handleLogoUpload}
              onClearLogo={() => setLogo(null)}
              building={buildingKit}
              onCopy={copy}
            />
          )}

          {view === "library" && <LibraryScreen reloadKey={reloadKey} />}
          {view === "runs" && <RunsScreen reloadKey={reloadKey} />}
        </main>

        {railOpen && (
          <PipelineRail
            steps={steps}
            statusText={statusText}
            running={running}
            lastResponse={lastResponse}
            onCopyResponse={() => copy(lastResponse, "Response JSON copied")}
            width={railWidth}
          />
        )}
      </div>

      {settingsOpen && (
        <SettingsDialog health={health} onClose={() => setSettingsOpen(false)} onHealth={setHealth} />
      )}

      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            left: "var(--space-6)",
            bottom: "var(--space-6)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            background: "var(--color-neutral-900)",
            color: "var(--color-neutral-100)",
            padding: "12px var(--space-4)",
            boxShadow: "var(--shadow-lg)",
            zIndex: 40,
            maxWidth: "min(460px, 80vw)",
          }}
        >
          <span style={{ width: 8, height: 8, background: "var(--color-accent)", flex: "none" }} />
          <span style={{ fontSize: 13 }}>{toast}</span>
        </div>
      )}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
      <span>{k}</span>
      <span style={{ fontFamily: mono }}>{v}</span>
    </div>
  );
}
