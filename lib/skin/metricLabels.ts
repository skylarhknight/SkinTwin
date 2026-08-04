import type { SkinMetrics } from "@/lib/types";

export const METRIC_LABELS: Record<keyof SkinMetrics, string> = {
  hydration: "Hydration",
  redness: "Redness",
  acne: "Clarity",
  pores: "Pores",
  texture: "Texture",
  wrinkles: "Fine lines",
  darkCircles: "Dark circles",
  pigmentation: "Tone",
  radiance: "Radiance",
  oiliness: "Oil balance",
};

export function metricLabel(key: keyof SkinMetrics | string): string {
  return METRIC_LABELS[key as keyof SkinMetrics] ?? String(key);
}

/**
 * Every metric is scored "higher is better", so a positive delta is always an improvement —
 * including for concern-shaped metrics like redness, where Perfect's score already inverts.
 */
export const METRIC_IMPROVEMENT_IS_UP = true;
