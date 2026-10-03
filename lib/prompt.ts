// Turns the creative brief from the UI into the prompt string sent to the model.
// Kept deliberately readable - the Brief screen tells the user this text is the prompt.

import { TONE_MODIFIERS, type Brief, type Strength } from "./types";

const STRENGTH_NOTE: Record<Strength, string> = {
  Subtle: "Stay very close to the reference image: same subject, same framing, same materials.",
  Balanced: "Keep the subject and mood of the reference image, but re-light and re-stage it.",
  Loose: "Use the reference image only as loose inspiration for subject and palette.",
};

/** Appended to every prompt. Text is added later by Cloudinary, so the model must not draw any. */
const GUARDRAILS =
  "Leave clean empty space in the upper third for a headline. " +
  "Do not render any text, words, letters or logos in the image. " +
  "High detail, sharp focus, professional commercial photography.";

export function buildPrompt(brief: Brief): string {
  const parts: string[] = [brief.brief.trim()];

  const modifiers = brief.tones
    .map((t) => TONE_MODIFIERS[t])
    .filter(Boolean)
    .join(", ");
  if (modifiers) parts.push(modifiers + ".");

  if (brief.sourcePublicId) parts.push(STRENGTH_NOTE[brief.strength]);

  parts.push(GUARDRAILS);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Each variation gets a slightly different prompt tail so the set is varied
 * even when the model ignores the seed.
 */
const VARIATION_ANGLES = [
  "Three-quarter hero angle.",
  "Straight-on eye-level composition.",
  "Low camera angle looking slightly up.",
  "Top-down flat composition.",
  "Tight crop on the subject.",
  "Wide shot with generous surrounding space.",
  "Slightly off-centre composition with space on the right.",
  "Symmetrical centred composition.",
];

export function promptForVariation(base: string, index: number): string {
  return `${base} ${VARIATION_ANGLES[index % VARIATION_ANGLES.length]}`;
}

/** Deterministic per-variation seed, so "lock seed" reproduces the same set. */
export function seedForVariation(seed: number, index: number): number {
  return (seed + index * 7919) % 2147483647;
}
