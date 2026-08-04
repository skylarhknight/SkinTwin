import type { SkinMaskAsset, SkinMetrics } from "@/lib/types";

const META = "skintwinMeta";
const PERFECT = "perfectResponse";

export type SkinforwardSkinRawMeta = {
  analyzedMetricKeys: (keyof SkinMetrics)[];
  maskAssets?: SkinMaskAsset[];
  maskBaseUrl?: string;
  skinAge?: number;
  analysisTier?: "hd" | "sd";
};

export type PerfectSkinRawExtras = {
  maskAssets?: SkinMaskAsset[];
  maskBaseUrl?: string;
  skinAge?: number;
  analysisTier?: "hd" | "sd";
};

/**
 * Persist Perfect poll payload plus the metadata the UI needs but cannot recover from column
 * values alone: which metrics were filled from API output (not demo filler), the mask overlays,
 * and which action tier ran.
 */
export function wrapPerfectSkinRaw(
  raw: unknown,
  analyzedMetricKeys: (keyof SkinMetrics)[],
  extras: PerfectSkinRawExtras = {}
): unknown {
  const meta: SkinforwardSkinRawMeta = { analyzedMetricKeys };
  if (extras.maskAssets?.length) meta.maskAssets = extras.maskAssets;
  if (extras.maskBaseUrl) meta.maskBaseUrl = extras.maskBaseUrl;
  if (extras.skinAge !== undefined) meta.skinAge = extras.skinAge;
  if (extras.analysisTier) meta.analysisTier = extras.analysisTier;
  return {
    [META]: meta,
    [PERFECT]: raw,
  };
}

export function unwrapPerfectSkinRaw(stored: unknown): {
  raw: unknown;
  analyzedMetricKeys?: (keyof SkinMetrics)[];
  maskAssets?: SkinMaskAsset[];
  maskBaseUrl?: string;
  skinAge?: number;
  analysisTier?: "hd" | "sd";
} {
  if (!stored || typeof stored !== "object") return { raw: stored };
  const o = stored as Record<string, unknown>;
  if (META in o && PERFECT in o && o[META] && typeof o[META] === "object") {
    const meta = o[META] as SkinforwardSkinRawMeta;
    const keys = meta.analyzedMetricKeys;
    if (Array.isArray(keys) && keys.length) {
      return {
        raw: o[PERFECT],
        analyzedMetricKeys: keys as (keyof SkinMetrics)[],
        maskAssets: Array.isArray(meta.maskAssets) ? meta.maskAssets : undefined,
        maskBaseUrl: meta.maskBaseUrl,
        skinAge: meta.skinAge,
        analysisTier: meta.analysisTier,
      };
    }
  }
  return { raw: stored };
}
