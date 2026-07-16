import { calculateOverallScore, getTopConcerns, neutralBaselineMetrics } from "@/lib/skin/skinScore";
import { unwrapPerfectSkinRaw } from "@/lib/perfect/scanRawEnvelope";
import type { FacialToneData, SkinMetrics } from "@/lib/types";

const METRIC_FALLBACK = neutralBaselineMetrics();

/** Minimal shape of a skin_scans row from Supabase (snake_case). */
export type SkinScansRow = {
  id: string;
  user_id: string;
  image_url: string;
  scan_date: string;
  overall_score: number | string | null;
  hydration_score: number | string | null;
  redness_score: number | string | null;
  acne_score: number | string | null;
  pore_score: number | string | null;
  texture_score: number | string | null;
  wrinkle_score: number | string | null;
  dark_circle_score: number | string | null;
  pigmentation_score: number | string | null;
  radiance_score: number | string | null;
  oiliness_score: number | string | null;
  top_concerns?: unknown;
  facial_tone_data?: unknown;
  raw_skin_analysis_response?: unknown;
  raw_color_tone_response?: unknown;
  is_mock?: boolean | null;
  created_at?: string;
};

function num(v: number | string | null | undefined, fallback: number): number {
  if (v === null || v === undefined) return fallback;
  const x = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(x)) return fallback;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function parseTopConcerns(
  raw: unknown,
  metrics: SkinMetrics,
  analyzedKeys?: (keyof SkinMetrics)[]
): string[] {
  if (Array.isArray(raw) && raw.every((x) => typeof x === "string")) {
    return raw as string[];
  }
  if (raw && typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      if (Array.isArray(p) && p.every((x) => typeof x === "string")) return p as string[];
    } catch {
      /* ignore */
    }
  }
  return getTopConcerns(metrics, 3, analyzedKeys);
}

function buildSummary(topConcerns: string[]): string {
  if (topConcerns.length === 0) return "Review your skin metrics to identify priority areas.";
  return `${topConcerns.join(", ")} are the top areas to watch today.`;
}

export type ScanApiResponse = {
  scanId: string;
  id: string;
  userId: string;
  imageUrl: string;
  scanDate: string;
  overallScore: number;
  metrics: SkinMetrics;
  topConcerns: string[];
  summary: string;
  isMock: boolean;
  analyzedMetricKeys?: (keyof SkinMetrics)[];
  facialToneData?: FacialToneData;
  rawSkinAnalysisResponse?: unknown;
  rawColorToneResponse?: unknown;
  createdAt?: string;
};

function toFacialToneData(raw: unknown): FacialToneData | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const undertone = typeof o.undertone === "string" ? o.undertone : "neutral";
  const pigmentationIndex = num(o.pigmentationIndex as number | string | null | undefined, 50);
  const rednessIndex = num(o.rednessIndex as number | string | null | undefined, 50);
  return { undertone, pigmentationIndex, rednessIndex };
}

/**
 * Maps a skin_scans DB row to the API payload shape used by POST /api/scans and client flows.
 */
export function dbSkinScanToScanResponse(row: SkinScansRow): ScanApiResponse {
  const { analyzedMetricKeys } = unwrapPerfectSkinRaw(row.raw_skin_analysis_response);

  const metrics: SkinMetrics = {
    hydration: num(row.hydration_score, METRIC_FALLBACK.hydration),
    redness: num(row.redness_score, METRIC_FALLBACK.redness),
    acne: num(row.acne_score, METRIC_FALLBACK.acne),
    pores: num(row.pore_score, METRIC_FALLBACK.pores),
    texture: num(row.texture_score, METRIC_FALLBACK.texture),
    wrinkles: num(row.wrinkle_score, METRIC_FALLBACK.wrinkles),
    darkCircles: num(row.dark_circle_score, METRIC_FALLBACK.darkCircles),
    pigmentation: num(row.pigmentation_score, METRIC_FALLBACK.pigmentation),
    radiance: num(row.radiance_score, METRIC_FALLBACK.radiance),
    oiliness: num(row.oiliness_score, METRIC_FALLBACK.oiliness),
  };

  const overallRaw = row.overall_score;
  const fallbackOverall = calculateOverallScore(metrics, analyzedMetricKeys);
  const overallScore =
    overallRaw === null || overallRaw === undefined || overallRaw === ""
      ? fallbackOverall
      : num(overallRaw, fallbackOverall);

  const topConcerns = parseTopConcerns(row.top_concerns, metrics, analyzedMetricKeys);

  const id = String(row.id);
  return {
    scanId: id,
    id,
    userId: String(row.user_id),
    imageUrl: row.image_url || "/mock/skin-scan-placeholder.svg",
    scanDate: row.scan_date ? String(row.scan_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
    overallScore,
    metrics,
    topConcerns,
    summary: buildSummary(topConcerns),
    isMock: Boolean(row.is_mock),
    ...(analyzedMetricKeys?.length ? { analyzedMetricKeys } : {}),
    facialToneData: toFacialToneData(row.facial_tone_data),
    rawSkinAnalysisResponse: row.raw_skin_analysis_response,
    rawColorToneResponse: row.raw_color_tone_response,
    createdAt: row.created_at,
  };
}
