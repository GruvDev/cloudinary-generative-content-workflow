// Channel-kit derivatives.
//
// The winning asset is generated once. Every channel size below is a pure
// Cloudinary URL transformation of that single asset - no re-generation, no
// re-upload, no extra storage. Changing a delivery option rebuilds a string.

import { CHANNELS, type Channel, type KitOutput } from "./types";
import { cloudinary, deliveryUrl } from "./cloudinary";

export const NAMED_TRANSFORMATION = "kiln_social_kit";

export interface KitOptions {
  /** Global delivery flags toggled in the UI. */
  delivery: string[];
  /** Optional headline burned in with a text layer. */
  headline?: string;
  /** Hex without the hash, e.g. "ec3013". */
  brandColor?: string;
  /** Overlay a logo asset in the corner. */
  logoPublicId?: string;
  /** Solid colour box behind the headline so it stays readable on a busy image. */
  scrim?: boolean;
  /** Override the cloud (used by demo mode, which reads Cloudinary's public demo cloud). */
  cloudName?: string;
}

/**
 * Font for the burned-in headline.
 *
 * Default is Roboto, a Cloudinary built-in, because it is the safest option:
 * built-in fonts accept the usual `bold` weight keyword directly.
 *
 * Google Fonts also work, via an `@google` suffix — but NOT combined with the
 * `bold` keyword. Cloudinary forwards the weight to the Google Fonts API, which
 * only accepts numeric weights, so `Archivo@google_64_bold` builds the invalid
 * request `family=Archivo:wght@bold` and the whole derivative returns HTTP 400.
 *
 * To use a Google font, set the family and clear or numerically set the weight:
 *   KILN_TEXT_FONT=Archivo@google
 *   KILN_TEXT_WEIGHT=            (empty — no weight qualifier at all)
 * `npm run verify` probes the available combinations and tells you which work.
 */
const FONT = process.env.KILN_TEXT_FONT || "Roboto";

/** Weight qualifier. Empty string means no weight is sent at all. */
const FONT_WEIGHT =
  process.env.KILN_TEXT_WEIGHT === undefined ? "bold" : process.env.KILN_TEXT_WEIGHT;

/** Text inside a transformation must have these characters escaped. */
function escapeText(input: string): string {
  return encodeURIComponent(
    input.replace(/,/g, "%252C").replace(/\//g, "%252F")
  );
}

/**
 * Build the transformation chain for one channel.
 * Returned as an array so the UI can show each step on its own line.
 */
export function buildChain(channel: Channel, opts: KitOptions): string[] {
  const chain: string[] = [];
  const delivery = new Set(opts.delivery);

  // 1. Smart crop to the channel's exact pixel size.
  //    g_auto uses Cloudinary's content-aware gravity so the subject survives
  //    the crop from square to 9:16.
  const gravity = delivery.has("g_auto") ? ",g_auto" : "";
  chain.push(`c_fill${gravity},w_${channel.width},h_${channel.height}`);

  // 2. Headline as a text layer, sized relative to the channel width.
  //
  //    `scrim` puts a solid colour box behind the text (the `b_` qualifier on a
  //    text layer). Note: e_gradient_fade is NOT used here - that effect fades
  //    the base image itself towards transparent, which is not a readability
  //    backdrop and looks wrong once the image is flattened to JPEG.
  if (opts.headline && opts.headline.trim()) {
    const size = Math.round(channel.width * 0.062);
    const color = (opts.brandColor || "ffffff").replace("#", "");
    const face = FONT_WEIGHT ? `${FONT}_${size}_${FONT_WEIGHT}` : `${FONT}_${size}`;
    const parts = [
      `l_text:${face}:${escapeText(opts.headline.trim())}`,
      `co_rgb:${color}`,
    ];
    if (opts.scrim) parts.push("b_rgb:111111");
    parts.push(
      "g_south_west",
      `x_${Math.round(channel.width * 0.055)}`,
      `y_${Math.round(channel.height * 0.075)}`
    );
    chain.push(parts.join(","));
  }

  // 3. Logo overlay.
  if (opts.logoPublicId) {
    chain.push(
      `l_${opts.logoPublicId.replace(/\//g, ":")},w_${Math.round(
        channel.width * 0.14
      )},g_north_east,x_32,y_32,o_90`
    );
  }

  // 4. Format and quality negotiation - always last so it applies to the result.
  const tail: string[] = [];
  if (delivery.has("f_auto")) tail.push("f_auto");
  if (delivery.has("q_auto")) tail.push("q_auto");
  if (delivery.has("dpr_auto")) tail.push("dpr_auto");
  if (delivery.has("e_sharpen")) tail.push("e_sharpen:60");
  if (tail.length) chain.push(tail.join(","));

  return chain;
}

export function buildKit(
  publicId: string,
  channelIds: string[],
  opts: KitOptions
): KitOutput[] {
  const wanted = CHANNELS.filter((c) => channelIds.includes(c.id));
  const list = wanted.length ? wanted : CHANNELS;

  return list.map((channel) => {
    const chain = buildChain(channel, opts);
    const transform = chain.join("/");
    return {
      id: channel.id,
      name: channel.label,
      use: channel.use,
      width: channel.width,
      height: channel.height,
      transform,
      url: deliveryUrl(publicId, transform, opts.cloudName),
      // fl_attachment must sit in the URL PATH to force a download. As a query
      // string it is ignored and the browser just opens the image. The HTML
      // `download` attribute does not help either - it is ignored cross-origin.
      downloadUrl: deliveryUrl(
        publicId,
        `${transform}/fl_attachment`,
        opts.cloudName
      ),
    };
  });
}

/** Small preview of any asset, used in grids. */
export function thumbUrl(publicId: string, size = 400, cloudName?: string): string {
  return deliveryUrl(
    publicId,
    `c_fill,g_auto,w_${size},h_${size},f_auto,q_auto`,
    cloudName
  );
}

/**
 * Register the kit as a named transformation on the account.
 * Deliveries can then use t_kiln_social_kit instead of a long chain, and the
 * whole kit can be re-tuned centrally without changing a single stored URL.
 */
// The kit rebuilds on every keystroke in the headline box. Without this cache
// each rebuild would spend an Admin API call, and the Admin API is rate limited
// (500/hour on the free plan) - a minute of typing could exhaust it.
let namedTransformationPromise: Promise<{ name: string; created: boolean }> | null = null;

export function ensureNamedTransformation(): Promise<{
  name: string;
  created: boolean;
}> {
  if (!namedTransformationPromise) {
    namedTransformationPromise = (async () => {
      const base = "c_fill,g_auto,w_1080,h_1080/f_auto,q_auto";
      try {
        await cloudinary.api.transformation(NAMED_TRANSFORMATION);
        return { name: NAMED_TRANSFORMATION, created: false };
      } catch {
        await cloudinary.api.create_transformation(NAMED_TRANSFORMATION, base);
        return { name: NAMED_TRANSFORMATION, created: true };
      }
    })().catch((err) => {
      // Do not cache a failure forever - let the next request retry.
      namedTransformationPromise = null;
      throw err;
    });
  }
  return namedTransformationPromise;
}

/** Code snippets shown on the Channel kit screen. */
export function snippets(publicId: string, outputs: KitOutput[], cloudName: string) {
  const first = outputs[0];
  const url = first?.url ?? deliveryUrl(publicId, "f_auto,q_auto");

  return {
    url: outputs.map((o) => `# ${o.name} (${o.width}x${o.height})\n${o.url}`).join("\n\n"),

    html: `<img\n  src="${url}"\n  srcset="${outputs
      .map((o) => `${o.url} ${o.width}w`)
      .join(",\n          ")}"\n  sizes="(max-width: 768px) 100vw, 1080px"\n  alt=""\n  width="${first?.width ?? 1080}"\n  height="${first?.height ?? 1080}"\n  loading="lazy"\n>`,

    node: `const { v2: cloudinary } = require("cloudinary");

cloudinary.config({ cloud_name: "${cloudName}", secure: true });

${outputs
  .map(
    (o) =>
      `// ${o.name}\ncloudinary.url("${publicId}", {\n  transformation: [${buildChain(
        CHANNELS.find((c) => c.id === o.id)!,
        { delivery: ["f_auto", "q_auto", "g_auto"] }
      )
        .map((step) => `"${step}"`)
        .join(", ")}]\n});`
  )
  .join("\n\n")}`,
  };
}
