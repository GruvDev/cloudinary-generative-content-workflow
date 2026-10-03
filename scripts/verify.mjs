#!/usr/bin/env node
/**
 * Kiln Studio — account verification.
 *
 *   npm run verify
 *
 * Runs the whole Cloudinary pipeline once against YOUR account and prints a
 * pass/fail report. Use it before recording the demo and before submitting:
 * it answers, in about a minute, the only question that matters — is this
 * really talking to Cloudinary, or is it falling back to sample assets?
 *
 * It creates a handful of assets under <folder>/_verify and deletes them again
 * at the end unless you pass --keep.
 */

import { readFileSync, existsSync } from "node:fs";
import { v2 as cloudinary } from "cloudinary";

// ── tiny .env.local loader (no dependency needed) ────────────────────────────
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}
loadEnv();

const KEEP = process.argv.includes("--keep");

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = process.env.KILN_FOLDER || "kiln";
const IMAGE_GEN_BASE =
  process.env.CLOUDINARY_IMAGEGEN_BASE || "https://api.cloudinary.com/v2";

const c = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", cyan: "\x1b[36m",
};

const results = [];
let step = 0;

/**
 * The Cloudinary SDK rejects with plain objects ({ error: { message } }), not
 * Error instances, so String(err) would print "[object Object]".
 */
function describe(err) {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const o = err;
    const parts = [
      o.error?.message,
      o.message,
      o.error?.http_code ? `http ${o.error.http_code}` : null,
      o.http_code ? `http ${o.http_code}` : null,
    ].filter(Boolean);
    if (parts.length) return parts.join(" · ");
    try {
      return JSON.stringify(err).slice(0, 220);
    } catch {
      return "unknown error object";
    }
  }
  return String(err);
}

function headline(text) {
  console.log(`\n${c.bold}${text}${c.reset}`);
  console.log(c.dim + "─".repeat(Math.min(72, text.length + 24)) + c.reset);
}

async function check(name, required, fn) {
  step += 1;
  process.stdout.write(`${c.dim}[${String(step).padStart(2, "0")}]${c.reset} ${name} … `);
  const started = Date.now();
  try {
    const detail = await fn();
    const ms = Date.now() - started;
    console.log(`${c.green}PASS${c.reset} ${c.dim}(${ms}ms)${c.reset}`);
    if (detail) console.log(`     ${c.dim}${detail}${c.reset}`);
    results.push({ name, state: "pass", required });
    return true;
  } catch (err) {
    const ms = Date.now() - started;
    const message = describe(err);
    console.log(`${required ? c.red + "FAIL" : c.yellow + "SKIP"}${c.reset} ${c.dim}(${ms}ms)${c.reset}`);
    console.log(`     ${c.dim}${message.slice(0, 220)}${c.reset}`);
    results.push({ name, state: required ? "fail" : "skip", required, message });
    return false;
  }
}

const made = [];
const stamp = Date.now().toString(36);
const base = `${FOLDER}/_verify/${stamp}`;

// A 256x256 PNG, generated inline so the upload test needs no fixture file.
// It must be at least 64x64, or the generative-transformation check fails for
// the wrong reason ("image is too small for gen_background_replace").
const TEST_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAADSklEQVR42u3ZMRXiQBRAUcJBAyY42EAG4iIDD2lSRERUUGCABjjMu7feYvP5LzPZnbZ1OUDV0QgQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABIAAQAAgABAACAAEAAIAAYAAQAAgABjFyQi+5ny/vf+H9/lhYl8wbetiCj9fd0kIwNKLQQD2XgkCsPdKEIDVl4EA7L0SBGD1ZfA5/iNs2O3/67+5E8ACOQoEYPVl4Apk+z2XAGyJp3MFshyuQ04A2+95BWAbPLUA7IFnF4ANMAEfwX54n8VOANtvJgIAAXjVmYwA/MbmIwDbb0oCsP1mlQ/A9puYKxAkA/D6N7duALbf9LoB2H4zdAWCZABe/ybpBIBkAF7/5tkNwPabqisQJAPw+jdbJwAIAGoBuP+YsBMAkgF4/ZuzEwAEALUA3H9M2wkAAoBaAO4/Zu4EAAGAACAUgA8Ak3cCgABAACAAEAAMH4B/AjJ/JwAIAAQAAgABgABAACAAEAAIAAQAAgABIAAQwJ/a54df0fydACAAEAAIAAQAhQD8Q5DJOwFAACAAyAXgM8DMnQAgAGgG4BZk2k4AEAA0A3ALMmcnAIQDcAiYsBMABADNANyCzNYJAOEAHAKmWj8BNGCerkAQDsAhYJJOAAgH4BAww/oJoAHTq1+BNGBuvgEgHIBDwMTqJ4AGzKp+BdKAKdW/ATRgPvWPYA2YTDoAqAfgEDCTl2lbl/Kvfr7frH75dXD025uAK5AN8OwC0ICnFoAGPK+P4LThP4utvhOgux+2XwDdLbH9rkDR65DVF0A0A6vvCtTdIdvvBIgeBVZfAMUS7L0AohlYfQEUS7D3AiiWYO8FkIvB0gsglIR1FwB8nP8IQwAgABAACAAEAAXT9XIxBZwAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAQAAgABAACAAGAAEAAIAAEYAQIAAQAAgABQMUT/J4edCFlpQQAAAAASUVORK5CYII=";

// Font settings must match lib/transforms.ts exactly.
const TEXT_FONT = process.env.KILN_TEXT_FONT || "Roboto";
const TEXT_WEIGHT =
  process.env.KILN_TEXT_WEIGHT === undefined ? "bold" : process.env.KILN_TEXT_WEIGHT;

async function main() {
  console.log(`${c.bold}${c.cyan}\n  KILN STUDIO — account verification${c.reset}`);
  console.log(`${c.dim}  cloud: ${CLOUD || "(not set)"} · folder: ${FOLDER}${c.reset}`);

  // ── 1. credentials ────────────────────────────────────────────────────────
  headline("Credentials");

  const haveCreds = await check("Three environment variables present", true, async () => {
    const missing = [
      ["CLOUDINARY_CLOUD_NAME", CLOUD],
      ["CLOUDINARY_API_KEY", KEY],
      ["CLOUDINARY_API_SECRET", SECRET],
    ]
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length) {
      throw new Error(
        `Missing: ${missing.join(", ")}. Copy .env.example to .env.local and fill it in.`
      );
    }
    return `cloud_name=${CLOUD}, key=…${String(KEY).slice(-4)}`;
  });

  if (!haveCreds) return finish();

  cloudinary.config({
    cloud_name: CLOUD, api_key: KEY, api_secret: SECRET, secure: true,
  });

  const pinged = await check("Cloudinary accepts the credentials", true, async () => {
    const res = await cloudinary.api.ping();
    return `ping: ${res.status}`;
  });

  if (!pinged) return finish();

  await check("Account usage readable", false, async () => {
    const usage = await cloudinary.api.usage();
    const credits = usage.credits
      ? `${usage.credits.usage ?? 0} / ${usage.credits.limit ?? "?"} credits used`
      : "credit info unavailable";
    return `plan: ${usage.plan ?? "unknown"} · ${credits}`;
  });

  // ── 2. upload ─────────────────────────────────────────────────────────────
  headline("Upload and asset management");

  let sourceId = null;
  await check("Upload an image (Upload API)", true, async () => {
    const res = await cloudinary.uploader.upload(TEST_PNG, {
      public_id: `${base}_source`,
      tags: "kiln,_verify",
      context: { kind: "verify" },
      overwrite: true,
    });
    sourceId = res.public_id;
    made.push(res.public_id);
    return `${res.public_id} · ${res.width}x${res.height} · ${res.bytes} bytes`;
  });

  await check("Merge tags and context metadata", true, async () => {
    // The app uses add_tag/add_context precisely because they MERGE. If these
    // were uploader.explicit, the AI Vision write would replace the tag set and
    // silently erase the kiln tag and run_id, emptying Library and Runs.
    await cloudinary.uploader.add_tag("verified", [sourceId]);
    await cloudinary.uploader.add_context(
      `caption=verification asset|run_id=verify_${stamp}`,
      [sourceId]
    );
    const after = await cloudinary.api.resource(sourceId, { context: true });
    const tags = after.tags ?? [];
    if (!tags.includes("kiln") || !tags.includes("verified")) {
      throw new Error(
        `Tag merge failed — expected both "kiln" and "verified", got [${tags.join(", ")}]`
      );
    }
    return `tags merged: [${tags.join(", ")}] — Library and Runs read these back`;
  });

  // ── 3. generation ─────────────────────────────────────────────────────────
  headline("AI image generation");

  let generatedId = null;
  const genOk = await check(
    "Image Generation API (text to image)",
    false,
    async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 90_000);
      try {
        const res = await fetch(`${IMAGE_GEN_BASE}/generate/${CLOUD}/text_to_image`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Basic " + Buffer.from(`${KEY}:${SECRET}`).toString("base64"),
          },
          body: JSON.stringify({
            prompt:
              "A single matte ceramic cup on a plain grey studio backdrop, soft light. No text.",
            model: { family: "flux", tier: "standard" },
            target: {
              target_type: "managed_asset",
              public_id: `${base}_gen`,
              tags: ["kiln", "_verify"],
            },
            width: 1024,
            height: 1024,
          }),
          signal: controller.signal,
        });
        const text = await res.text();
        if (!res.ok) {
          throw new Error(
            `HTTP ${res.status} from ${IMAGE_GEN_BASE}. ${text.slice(0, 180)}`
          );
        }
        let publicId = `${base}_gen`;
        try {
          const json = JSON.parse(text);
          publicId =
            json.public_id || json.publicId || json?.asset?.public_id || publicId;
        } catch {
          /* defensive: response shape may differ */
        }
        generatedId = publicId;
        made.push(publicId);
        return `generated and stored as ${publicId}`;
      } finally {
        clearTimeout(timer);
      }
    }
  );

  if (!genOk) {
    console.log(
      `     ${c.yellow}→ The app will fall back to generative transformations on an uploaded source.${c.reset}`
    );
    console.log(
      `     ${c.yellow}→ Enable the Image Generation add-on, or check CLOUDINARY_IMAGEGEN_BASE.${c.reset}`
    );
  }

  await check("Generative transformation fallback (e_gen_background_replace)", false, async () => {
    const url = `https://res.cloudinary.com/${CLOUD}/image/upload/e_gen_background_replace:prompt_${encodeURIComponent(
      "a bright clean studio backdrop"
    )}/c_fill,w_600,h_600/f_auto,q_auto/${sourceId}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} — ${res.headers.get("x-cld-error") ?? "no detail"}`);
    }
    return "fallback path renders";
  });

  // ── 4. AI Vision ──────────────────────────────────────────────────────────
  headline("AI Vision");

  const captioned = await check("Captioning returns a real caption", false, async () => {
    const res = await cloudinary.uploader.explicit(generatedId ?? sourceId, {
      type: "upload",
      detection: "captioning",
    });
    const caption = res?.info?.detection?.captioning?.data?.caption;
    if (!caption) {
      throw new Error(
        "The call succeeded but returned no caption — the AI Vision add-on is probably not enabled on this account."
      );
    }
    return `caption: ${String(caption).slice(0, 90)}`;
  });

  if (!captioned) {
    console.log(
      `     ${c.yellow}→ Captions will fall back to keywords pulled from your own prompt.${c.reset}`
    );
    console.log(
      `     ${c.yellow}→ Library search still works; it just searches those keywords instead.${c.reset}`
    );
  }

  // ── 5. transformations and delivery ───────────────────────────────────────
  headline("Transformations and delivery");

  const subject = generatedId ?? sourceId;

  /** Render one text layer with a given font spec and report whether it works. */
  const tryFont = async (font, weight) => {
    const face = weight ? `${font}_67_${weight}` : `${font}_67`;
    const transform = `c_fill,g_auto,w_1080,h_1080/l_text:${face}:KILN%20VERIFY,co_rgb:ffffff,b_rgb:111111,g_south_west,x_59,y_81/f_auto,q_auto`;
    const url = `https://res.cloudinary.com/${CLOUD}/image/upload/${transform}/${subject}`;
    const res = await fetch(url);
    return {
      ok: res.ok,
      status: res.status,
      detail: res.headers.get("x-cld-error") ?? "",
      type: res.headers.get("content-type"),
      bytes: res.headers.get("content-length"),
      url,
    };
  };

  const fontOk = await check(
    `Channel-kit derivative renders (font: ${TEXT_FONT}${TEXT_WEIGHT ? ` ${TEXT_WEIGHT}` : ""})`,
    true,
    async () => {
      const r = await tryFont(TEXT_FONT, TEXT_WEIGHT);
      if (!r.ok) throw new Error(`HTTP ${r.status} — ${r.detail}\n     ${r.url}`);
      return `${r.type} · ${r.bytes ?? "?"} bytes · text layer + smart crop OK`;
    }
  );

  // If the configured font failed, find one that works rather than leaving the
  // user to guess. Cloudinary forwards the weight keyword to Google Fonts, which
  // rejects anything non-numeric, so `<family>@google` + `bold` always 400s.
  if (!fontOk) {
    console.log(`     ${c.yellow}→ Probing alternative fonts…${c.reset}`);
    const candidates = [
      ["Roboto", "bold"],
      ["Arial", "bold"],
      ["Archivo@google", ""],
      ["Archivo@google", "700"],
      ["Verdana", "bold"],
    ];
    let found = null;
    for (const [font, weight] of candidates) {
      if (font === TEXT_FONT && weight === TEXT_WEIGHT) continue;
      try {
        const r = await tryFont(font, weight);
        const label = `${font}${weight ? ` ${weight}` : " (no weight)"}`;
        if (r.ok) {
          console.log(`        ${c.green}works${c.reset}  ${label}`);
          if (!found) found = [font, weight];
        } else {
          console.log(`        ${c.dim}fails  ${label} — HTTP ${r.status}${c.reset}`);
        }
      } catch {
        console.log(`        ${c.dim}fails  ${font} — request error${c.reset}`);
      }
    }
    if (found) {
      const [font, weight] = found;
      console.log(`\n     ${c.bold}Fix: add these to .env.local${c.reset}`);
      console.log(`       KILN_TEXT_FONT=${font}`);
      console.log(`       KILN_TEXT_WEIGHT=${weight}`);
      console.log(`     ${c.dim}(an empty KILN_TEXT_WEIGHT means no weight qualifier)${c.reset}`);
    }
  }

  await check("Forced-download URL (fl_attachment)", true, async () => {
    const url = `https://res.cloudinary.com/${CLOUD}/image/upload/c_fill,w_600,h_600/f_auto,q_auto/fl_attachment/${subject}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const disposition = res.headers.get("content-disposition") ?? "";
    if (!disposition.toLowerCase().includes("attachment")) {
      throw new Error(`No attachment header returned (got "${disposition}")`);
    }
    return disposition;
  });

  await check("Named transformation can be created", false, async () => {
    const name = "kiln_social_kit";
    try {
      await cloudinary.api.transformation(name);
      return `${name} already exists`;
    } catch {
      await cloudinary.api.create_transformation(name, "c_fill,g_auto,w_1080,h_1080/f_auto,q_auto");
      return `${name} created`;
    }
  });

  // ── 6. search ─────────────────────────────────────────────────────────────
  headline("Search");

  await check("Search API returns the tagged assets", true, async () => {
    // Indexing is near-real-time but not instant.
    await new Promise((r) => setTimeout(r, 2500));
    const res = await cloudinary.search
      .expression("tags=_verify AND resource_type:image")
      .with_field("context")
      .with_field("tags")
      .max_results(10)
      .execute();
    if (!res.resources?.length) {
      throw new Error(
        "No results yet. Search indexing can lag a few seconds — re-run to confirm."
      );
    }
    return `${res.resources.length} asset(s) found — this is what the Library screen reads`;
  });

  finish();
}

async function cleanup() {
  if (!made.length) return;
  if (KEEP) {
    console.log(`\n${c.dim}Kept ${made.length} verification asset(s): ${made.join(", ")}${c.reset}`);
    return;
  }
  try {
    await cloudinary.api.delete_resources(made);
    console.log(`\n${c.dim}Cleaned up ${made.length} verification asset(s).${c.reset}`);
  } catch {
    console.log(
      `\n${c.yellow}Could not auto-delete verification assets. Remove ${FOLDER}/_verify manually.${c.reset}`
    );
  }
}

async function finish() {
  await cleanup();

  const failed = results.filter((r) => r.state === "fail");
  const skipped = results.filter((r) => r.state === "skip");
  const passed = results.filter((r) => r.state === "pass");

  console.log(`\n${c.bold}Result${c.reset}`);
  console.log(c.dim + "─".repeat(72) + c.reset);
  console.log(
    `  ${c.green}${passed.length} passed${c.reset}` +
      (skipped.length ? ` · ${c.yellow}${skipped.length} optional not available${c.reset}` : "") +
      (failed.length ? ` · ${c.red}${failed.length} failed${c.reset}` : "")
  );

  if (failed.length) {
    console.log(
      `\n${c.red}Not ready.${c.reset} Fix the failures above, then run ${c.bold}npm run verify${c.reset} again.`
    );
    process.exitCode = 1;
    return;
  }

  if (skipped.length) {
    console.log(
      `\n${c.yellow}Ready, with the fallback path.${c.reset} The core pipeline works. The optional\n` +
        `checks above are add-ons that are not enabled on this account — the app handles\n` +
        `that, but enable them if you can, and mention the fallback in your demo.`
    );
  } else {
    console.log(
      `\n${c.green}Ready.${c.reset} Generation, vision, transformation, delivery and search all\n` +
        `work on this account. Run ${c.bold}npm run dev${c.reset} and the app will use them —\n` +
        `the "sample assets" badge should be gone from the header.`
    );
  }
}

main().catch(async (err) => {
  console.error(`\n${c.red}Verification crashed:${c.reset}`, err);
  await cleanup();
  process.exitCode = 1;
});
