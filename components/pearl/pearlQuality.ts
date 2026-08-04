/**
 * Device capability detection for the pearl liquid-glass system.
 *
 * Everything here is a one-shot read at mount time. The tier it returns picks
 * the shader permutation (octaves / sculptural forms), the pixel-ratio cap, an
 * internal resolution scale, and a frame budget — so a phone renders a simpler
 * scene at a lower resolution rather than a stuttering desktop scene.
 */

import type { PearlQuality } from "./pearlShader";

export type PearlEnvironment = {
  quality: PearlQuality;
  /** Hard cap on devicePixelRatio for the drawing buffer. */
  maxDpr: number;
  /** Extra multiplier on the buffer size — sub-native rendering for weak GPUs. */
  resolutionScale: number;
  /** Minimum milliseconds between rendered frames (30fps on the low tier). */
  frameBudget: number;
  /** Pointer-driven deformation is only meaningful with a fine pointer. */
  pointerCapable: boolean;
  reducedMotion: boolean;
};

type NavigatorWithHints = Navigator & { deviceMemory?: number };

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function hasFinePointer(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(pointer: coarse)").matches;
}

/** Read the device once and pick a tier. Safe to call only in the browser. */
export function detectEnvironment(): PearlEnvironment {
  const reducedMotion = prefersReducedMotion();
  const pointerCapable = hasFinePointer();
  const width = window.innerWidth;
  const nav = navigator as NavigatorWithHints;
  const memory = nav.deviceMemory ?? 8;
  const cores = nav.hardwareConcurrency ?? 8;

  let quality: PearlQuality = "high";
  if (!pointerCapable || width < 768 || memory <= 4 || cores <= 4) quality = "low";
  else if (width < 1280 || memory <= 8 || cores <= 8) quality = "medium";

  const byTier: Record<PearlQuality, Omit<PearlEnvironment, "quality" | "pointerCapable" | "reducedMotion">> = {
    high: { maxDpr: 1.75, resolutionScale: 1, frameBudget: 0 },
    medium: { maxDpr: 1.4, resolutionScale: 0.85, frameBudget: 0 },
    low: { maxDpr: 1.25, resolutionScale: 0.7, frameBudget: 1000 / 30 },
  };

  return { quality, pointerCapable, reducedMotion, ...byTier[quality] };
}
