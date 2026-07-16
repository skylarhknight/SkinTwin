import type { SkinMetrics } from "../types";

const METRIC_KEYS = [
  "hydration",
  "redness",
  "acne",
  "pores",
  "texture",
  "wrinkles",
  "darkCircles",
  "pigmentation",
  "radiance",
  "oiliness",
] as const satisfies readonly (keyof SkinMetrics)[];

const DEFAULT_SKIN_METRICS: SkinMetrics = {
  hydration: 62,
  redness: 70,
  acne: 84,
  pores: 76,
  texture: 82,
  wrinkles: 88,
  darkCircles: 66,
  pigmentation: 68,
  radiance: 74,
  oiliness: 58,
};

/** Baseline for Perfect rows we did not receive (not demo personas — avoids identical false “profiles”). */
export function neutralBaselineMetrics(): SkinMetrics {
  return METRIC_KEYS.reduce((acc, key) => {
    acc[key] = 50;
    return acc;
  }, {} as SkinMetrics);
}

const SCORE_WEIGHTS: Record<keyof SkinMetrics, number> = {
  hydration: 0.18,
  radiance: 0.15,
  texture: 0.15,
  acne: 0.12,
  pores: 0.10,
  pigmentation: 0.10,
  redness: 0.08,
  darkCircles: 0.07,
  wrinkles: 0.05,
  oiliness: 0,
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function readNumeric(raw: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

export function normalizeSkinMetrics(raw: unknown): SkinMetrics {
  if (!raw || typeof raw !== "object") return DEFAULT_SKIN_METRICS;

  const source = raw as Record<string, unknown>;
  const rawMetrics =
    source.metrics && typeof source.metrics === "object"
      ? (source.metrics as Record<string, unknown>)
      : source;

  const aliases: Record<keyof SkinMetrics, string[]> = {
    hydration: ["hydration", "hydrationScore", "hydration_score"],
    redness: ["redness", "rednessScore", "redness_score"],
    acne: ["acne", "acneScore", "acne_score", "spots", "spotScore", "spot_score"],
    pores: ["pores", "poreScore", "pore_score", "poresScore", "pores_score"],
    texture: ["texture", "textureScore", "texture_score"],
    wrinkles: ["wrinkles", "wrinkleScore", "wrinkle_score"],
    darkCircles: ["darkCircles", "darkCircleScore", "dark_circle_score", "dark_circles"],
    pigmentation: ["pigmentation", "pigmentationScore", "pigmentation_score", "spotsTone"],
    radiance: ["radiance", "radianceScore", "radiance_score", "brightness"],
    oiliness: ["oiliness", "oilinessScore", "oiliness_score", "oil"],
  };

  return METRIC_KEYS.reduce((metrics, key) => {
    const value = readNumeric(rawMetrics, aliases[key]);
    metrics[key] = clampScore(value ?? DEFAULT_SKIN_METRICS[key]);
    return metrics;
  }, {} as SkinMetrics);
}

export function calculateOverallScore(metrics: SkinMetrics, analyzedKeys?: (keyof SkinMetrics)[]): number {
  if (analyzedKeys && analyzedKeys.length > 0) {
    const keys = [...new Set(analyzedKeys)].filter((k) => k in SCORE_WEIGHTS);
    const weightSum = keys.reduce((s, k) => s + SCORE_WEIGHTS[k], 0);
    if (weightSum <= 0) return clampScore(0);
    const weightedScore = keys.reduce((t, k) => t + metrics[k] * SCORE_WEIGHTS[k], 0);
    return clampScore(weightedScore / weightSum);
  }
  const weightedScore = METRIC_KEYS.reduce((total, key) => total + metrics[key] * SCORE_WEIGHTS[key], 0);
  return clampScore(weightedScore);
}

export function getTopConcerns(metrics: SkinMetrics, count = 3, onlyKeys?: (keyof SkinMetrics)[]): string[] {
  const pool =
    onlyKeys && onlyKeys.length > 0
      ? [...new Set(onlyKeys)].filter((k) => k !== "oiliness")
      : [...METRIC_KEYS].filter((key) => key !== "oiliness");
  return [...pool].sort((a, b) => metrics[a] - metrics[b]).slice(0, Math.min(count, pool.length));
}
