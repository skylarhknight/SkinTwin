import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/serverAuth";
import { generateInsights } from "@/lib/insights/insightEngine";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureAppUser } from "@/lib/supabase/ensureAppUser";
import { persistInsights } from "@/lib/supabase/insightStore";
import { dbSkinScanToScanResponse, type SkinScansRow } from "@/lib/supabase/scanMapper";
import type { DailyHabit, Product, UserProfile } from "@/lib/types";

function mapHabitRow(row: Record<string, unknown>): DailyHabit {
  return {
    logDate: String(row.log_date ?? new Date().toISOString().slice(0, 10)),
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
    activeIngredients: Array.isArray(row.active_ingredients) ? row.active_ingredients.map((x) => String(x)) : [],
    usageTime: (String(row.usage_time ?? "AM") as Product["usageTime"]) || "AM",
    frequency: String(row.frequency ?? "daily"),
    dateStarted: String(row.date_started ?? new Date().toISOString().slice(0, 10)),
    dateStopped: row.date_stopped == null ? undefined : String(row.date_stopped),
    notes: row.notes == null ? undefined : String(row.notes),
  };
}

function mapProfileRow(row: Record<string, unknown>): UserProfile {
  return {
    skinType: (String(row.skin_type ?? "unsure") as UserProfile["skinType"]) || "unsure",
    sensitivityLevel: (String(row.sensitivity_level ?? "medium") as UserProfile["sensitivityLevel"]) || "medium",
    routineExperience:
      (String(row.routine_experience ?? "beginner") as UserProfile["routineExperience"]) || "beginner",
    budgetLevel: (String(row.budget_level ?? "$$") as UserProfile["budgetLevel"]) || "$$",
    primaryGoals: Array.isArray(row.primary_goals) ? row.primary_goals.map((x) => String(x)) : [],
  };
}

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const [{ data: scans }, { data: habits }, { data: products }, { data: profile }] = await Promise.all([
    supabase.from("skin_scans").select("*").eq("user_id", userId).order("scan_date", { ascending: true }),
    supabase.from("daily_habits").select("*").eq("user_id", userId).order("log_date", { ascending: true }),
    supabase.from("products").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  const mappedScans = (scans ?? []).map((s) => dbSkinScanToScanResponse(s as SkinScansRow));

  const insights = generateInsights({
    scans: mappedScans,
    habits: (habits ?? []).map((h) => mapHabitRow(h as Record<string, unknown>)),
    products: (products ?? []).map((p) => mapProductRow(p as Record<string, unknown>)),
    profile: profile ? mapProfileRow(profile as Record<string, unknown>) : undefined,
  });

  /**
   * Insights are derived deterministically from the data above, so the snapshot
   * is refreshed on every read. Persisting it keeps stable ids for the UI and
   * gives other surfaces (and future notifications) something to query.
   */
  const ensured = await ensureAppUser(supabase, user);
  if (!ensured) return NextResponse.json({ insights });

  const persisted = await persistInsights(supabase, userId, insights, mappedScans.at(-1)?.id ?? null);
  return NextResponse.json({ insights: persisted });
}
