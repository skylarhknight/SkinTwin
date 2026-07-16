import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/auth/serverAuth";
import type { SkinMetrics } from "@/lib/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbSkinScanToScanResponse, type SkinScansRow } from "@/lib/supabase/scanMapper";

const metricKeys = ["hydration", "redness", "pigmentation", "darkCircles", "texture", "radiance"] as (keyof SkinMetrics)[];
type TrendPoint = { date: string; value: number };

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function makeSeriesFromScans(
  scans: ReturnType<typeof dbSkinScanToScanResponse>[],
  metric: keyof SkinMetrics,
  cutoffMs: number
): TrendPoint[] {
  const byDay = new Map<string, number>();
  for (const scan of scans) {
    const ts = Date.parse(scan.scanDate);
    if (!Number.isFinite(ts) || ts < cutoffMs) continue;
    const day = scan.scanDate.slice(5, 10);
    byDay.set(day, clamp(scan.metrics[metric]));
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

function buildCallouts(
  scans: ReturnType<typeof dbSkinScanToScanResponse>[],
  metricList: (keyof SkinMetrics)[]
): string[] {
  if (scans.length < 2) return ["Collect at least two scans to unlock trend callouts."];
  const first = scans[0].metrics;
  const last = scans[scans.length - 1].metrics;
  const changes = metricList
    .map((m) => ({ metric: m, delta: Math.round((last[m] - first[m]) * 10) / 10 }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);
  return changes.map((c) =>
    c.delta === 0
      ? `${c.metric} is unchanged versus your first recorded scan in this range.`
      : `${c.metric} ${c.delta > 0 ? "improved" : "declined"} by ${Math.abs(c.delta)} points in this range.`
  );
}

export async function GET(request: Request) {
  const userId = await getRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const range = (url.searchParams.get("range") ?? "30d") as "7d" | "30d" | "90d";
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const metrics = (url.searchParams.get("metrics")?.split(",") ?? metricKeys) as (keyof SkinMetrics)[];
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({
      range,
      series: Object.fromEntries(metrics.map((m) => [m, []])),
      radar: null,
      callouts: ["Supabase is not configured in this environment, so no trend history is available."],
    });
  }

  const { data, error } = await supabase
    .from("skin_scans")
    .select("*")
    .eq("user_id", userId)
    .order("scan_date", { ascending: true });

  if (error) {
    return NextResponse.json({
      range,
      series: Object.fromEntries(metrics.map((m) => [m, []])),
      radar: null,
      callouts: [`Could not load trends: ${error.message}`],
    });
  }

  const scans = (data ?? []).map((row) => dbSkinScanToScanResponse(row as SkinScansRow));
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const inRange = scans.filter((s) => {
    const ts = Date.parse(s.scanDate);
    return Number.isFinite(ts) && ts >= cutoffMs;
  });

  const series = Object.fromEntries(metrics.map((m) => [m, makeSeriesFromScans(inRange, m, cutoffMs)]));
  const baseline = inRange[0]?.metrics;
  const current = inRange.at(-1)?.metrics;

  return NextResponse.json({
    range,
    series,
    radar: baseline && current ? { baseline, current } : null,
    callouts: buildCallouts(inRange, metrics),
  });
}
