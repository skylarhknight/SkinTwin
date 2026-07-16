import type { SkinMetrics } from "@/lib/types";

const META = "skintwinMeta";
const PERFECT = "perfectResponse";

export type SkinforwardSkinRawMeta = {
  analyzedMetricKeys: (keyof SkinMetrics)[];
};

/** Persist Perfect poll payload plus which metrics were filled from API output (not demo filler). */
export function wrapPerfectSkinRaw(raw: unknown, analyzedMetricKeys: (keyof SkinMetrics)[]): unknown {
  return {
    [META]: { analyzedMetricKeys },
    [PERFECT]: raw,
  };
}

export function unwrapPerfectSkinRaw(stored: unknown): {
  raw: unknown;
  analyzedMetricKeys?: (keyof SkinMetrics)[];
} {
  if (!stored || typeof stored !== "object") return { raw: stored };
  const o = stored as Record<string, unknown>;
  if (META in o && PERFECT in o && o[META] && typeof o[META] === "object") {
    const meta = o[META] as SkinforwardSkinRawMeta;
    const keys = meta.analyzedMetricKeys;
    if (Array.isArray(keys) && keys.length)
      return { raw: o[PERFECT], analyzedMetricKeys: keys as (keyof SkinMetrics)[] };
  }
  return { raw: stored };
}
