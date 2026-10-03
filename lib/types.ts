// Shared types used by both the API routes and the UI.

export type ModelFamily =
  | "flux"
  | "ideogram"
  | "recraft"
  | "nano-banana"
  | "gpt-image";

export type Tier = "standard" | "premium";

export type Aspect = "1:1" | "4:5" | "16:9";

export type Strength = "Subtle" | "Balanced" | "Loose";

export interface ModelInfo {
  id: ModelFamily;
  name: string;
  vendor: string;
  note: string;
}

export const MODELS: ModelInfo[] = [
  { id: "flux", name: "Flux", vendor: "Black Forest Labs", note: "photoreal" },
  { id: "ideogram", name: "Ideogram", vendor: "Ideogram AI", note: "typography" },
  { id: "recraft", name: "Recraft", vendor: "Recraft", note: "vector / brand" },
  { id: "nano-banana", name: "Nano Banana", vendor: "Google", note: "text in image" },
  { id: "gpt-image", name: "GPT Image", vendor: "OpenAI", note: "prompt fidelity" },
];

export const ASPECT_DIMS: Record<Aspect, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "4:5": { width: 1024, height: 1280 },
  "16:9": { width: 1344, height: 768 },
};

/** A channel the winning asset is derived into, via Cloudinary transformations. */
export interface Channel {
  id: string;
  label: string;
  width: number;
  height: number;
  use: string;
}

export const CHANNELS: Channel[] = [
  { id: "ig", label: "Instagram post", width: 1080, height: 1080, use: "Feed, square" },
  { id: "story", label: "Story / Reel", width: 1080, height: 1920, use: "Full-bleed vertical" },
  { id: "x", label: "X / LinkedIn card", width: 1200, height: 628, use: "Link preview" },
  { id: "email", label: "Email hero", width: 1200, height: 600, use: "Newsletter banner" },
  { id: "thumb", label: "YouTube thumb", width: 1280, height: 720, use: "Video cover" },
];

export interface Brief {
  name: string;
  brief: string;
  tones: string[];
  model: ModelFamily;
  tier: Tier;
  count: number;
  strength: Strength;
  aspect: Aspect;
  seed: string;
  seedLock: boolean;
  sourcePublicId?: string;
  channels: string[];
}

export interface VisionResult {
  caption: string;
  tags: string[];
  safe: boolean;
}

export interface Variant {
  index: number;
  status: "pending" | "done" | "error";
  publicId?: string;
  url?: string;
  thumbUrl?: string;
  width?: number;
  height?: number;
  bytes?: number;
  model?: ModelFamily;
  tier?: Tier;
  seed?: number;
  ms?: number;
  vision?: VisionResult;
  error?: string;
  demo?: boolean;
}

export interface KitOutput {
  id: string;
  name: string;
  use: string;
  width: number;
  height: number;
  url: string;
  /** Same derivative, but with fl_attachment so the browser saves it. */
  downloadUrl: string;
  transform: string;
}

export interface PipelineStep {
  key: string;
  label: string;
  api: string;
  detail: string;
  ms?: number;
  state: "idle" | "running" | "done" | "error";
}

export interface LibraryItem {
  publicId: string;
  url: string;
  thumbUrl: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  tags: string[];
  model: string;
  caption?: string;
  createdAt: string;
}

export interface RunRow {
  id: string;
  brief: string;
  model: string;
  variants: number;
  derivatives: number;
  durationMs: number;
  credits: number;
  status: "complete" | "partial" | "failed" | "running";
  createdAt: string;
}

export const TONE_CHIPS = [
  "Editorial",
  "High-contrast",
  "Soft daylight",
  "Minimal",
  "Luxury",
  "Playful",
];

/** Style modifiers appended to the prompt for each tone chip. */
export const TONE_MODIFIERS: Record<string, string> = {
  Editorial: "editorial magazine styling, considered composition, generous negative space",
  "High-contrast": "hard single-source light, deep crushed shadows, strong specular highlights",
  "Soft daylight": "soft diffused daylight, gentle falloff, low contrast, airy",
  Minimal: "minimal set, single subject, clean seamless backdrop, nothing extraneous",
  Luxury: "premium product photography, rich materials, subtle reflections, refined palette",
  Playful: "bright saturated palette, bold simple shapes, energetic and friendly",
};
