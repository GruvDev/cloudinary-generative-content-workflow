// Cloudinary SDK configuration + shared constants.
// Every credential stays server-side. The browser never sees the API secret.

import { v2 as cloudinary } from "cloudinary";

export const CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  "";
export const API_KEY = process.env.CLOUDINARY_API_KEY || "";
export const API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

/** Everything this app creates lives under one folder, so it is easy to find and clean up. */
export const FOLDER = process.env.KILN_FOLDER || "kiln";
/** Every asset carries this tag. The Library screen searches on it. */
export const ROOT_TAG = "kiln";

/**
 * Demo mode serves a pre-baked run instead of calling the generation API.
 * Used as a fallback when credentials are missing or credits run out, so the
 * app is always demonstrable.
 */
export const DEMO_MODE = process.env.KILN_DEMO_MODE === "true";

export const hasCredentials = Boolean(CLOUD_NAME && API_KEY && API_SECRET);

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
});

export { cloudinary };

/** Basic auth header for the REST endpoints the SDK does not cover. */
export function basicAuthHeader(): string {
  return "Basic " + Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");
}

/** Build a delivery URL by hand so the exact transformation string stays visible in the UI. */
export function deliveryUrl(
  publicId: string,
  transform: string,
  cloud: string = CLOUD_NAME
): string {
  const t = transform ? `${transform}/` : "";
  return `https://res.cloudinary.com/${cloud}/image/upload/${t}${publicId}`;
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "untitled"
  );
}

export class CloudinaryConfigError extends Error {
  constructor() {
    super(
      "Cloudinary credentials are not set. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to .env.local, or set KILN_DEMO_MODE=true to run on sample assets."
    );
    this.name = "CloudinaryConfigError";
  }
}
