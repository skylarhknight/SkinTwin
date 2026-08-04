import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/auth/serverAuth";
import { buildProgressReport } from "@/lib/skin/progress";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbSkinScanToScanResponse, type SkinScansRow } from "@/lib/supabase/scanMapper";
import type { DailyHabit, Product, SkinScan } from "@/lib/types";

function mapHabitRow(row: Record<string, unknown>): DailyHabit {
  return {
    logDate: String(row.log_date ?? "").slice(0, 10),
    waterIntakeMl: Number(row.water_intake_ml ?? 0),
    sleepHours: Number(row.sleep_hours ?? 0),
    usedSpf: Boolean(row.used_spf),
    stressLevel: Number(row.stress_level ?? 3) as DailyHabit["stressLevel"],
    exerciseMinutes: row.exercise_minutes == null ? undefined : Number(row.exercise_minutes),
    notes: row.notes == null ? undefined : String(row.notes),
  };
}

function mapProductRow(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    brand: row.brand == null ? undefined : String(row.brand),
    category: String(row.category ?? "serum"),
    activeIngredients: Array.isArray(row.active_ingredients) ? row.active_ingredients.map(String) : [],
    usageTime: (String(row.usage_time ?? "AM") as Product["usageTime"]) || "AM",
    frequency: String(row.frequency ?? "daily"),
    dateStarted: String(row.date_started ?? "").slice(0, 10),
    dateStopped: row.date_stopped == null ? undefined : String(row.date_stopped).slice(0, 10),
    notes: row.notes == null ? undefined : String(row.notes),
  };
}

/**
 * Builds the scan-to-scan progress report.
 *
 * `from` / `to` select which two scans to compare; without them we use the two most recent, which
 * is what the page loads by default.
 */
export async function GET(request: Request) {
  const userId = await getRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({
      report: null,
      scans: [],
      reason: "Progress needs at least two saved scans, which requires a configured database.",
    });
  }

  const url = new URL(request.url);
  const fromId = url.searchParams.get("from");
  const toId = url.searchParams.get("to");

  const { data: scanRows, error: scanError } = await supabase
    .from("skin_scans")
    .select("*")
    .eq("user_id", userId)
    .order("scan_date", { ascending: true });

  if (scanError) return NextResponse.json({ error: scanError.message }, { status: 500 });

  const scans: SkinScan[] = (scanRows ?? []).map((r) => dbSkinScanToScanResponse(r as SkinScansRow));
  // A scan list is only useful here for choosing endpoints, so keep it light for the client.
  const index = scans.map((s) => ({
    id: s.id,
    scanDate: s.scanDate,
    overallScore: s.overallScore,
    isMock: s.isMock,
  }));

  if (scans.length < 2) {
    return NextResponse.json({
      report: null,
      scans: index,
      reason: "Take at least two scans on different days to see what changed.",
    });
  }

  const before = (fromId && scans.find((s) => s.id === fromId)) || scans[scans.length - 2];
  const after = (toId && scans.find((s) => s.id === toId)) || scans[scans.length - 1];

  if (before.id === after.id) {
    return NextResponse.json({
      report: null,
      scans: index,
      reason: "Pick two different scans to compare.",
    });
  }

  // Order defensively — a user can select the endpoints in either direction.
  const [earlier, later] =
    new Date(before.scanDate).getTime() <= new Date(after.scanDate).getTime()
      ? [before, after]
      : [after, before];

  const [habitsRes, productsRes] = await Promise.all([
    supabase
      .from("daily_habits")
      .select("*")
      .eq("user_id", userId)
      .gte("log_date", earlier.scanDate)
      .lte("log_date", later.scanDate),
    supabase.from("products").select("*").eq("user_id", userId),
  ]);

  if (habitsRes.error) console.warn("[GET /api/progress] habits query failed:", habitsRes.error.message);
  if (productsRes.error) console.warn("[GET /api/progress] products query failed:", productsRes.error.message);

  const habits = (habitsRes.data ?? []).map((r) => mapHabitRow(r as Record<string, unknown>));
  const products = (productsRes.data ?? []).map((r) => mapProductRow(r as Record<string, unknown>));

  const report = buildProgressReport({ before: earlier, after: later, habits, products });

  return NextResponse.json({ report, scans: index });
}
