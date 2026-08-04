import { NextResponse } from "next/server";
import { demoDashboardPayload } from "@/lib/apiDemo";
import { getRequestUserId } from "@/lib/auth/serverAuth";
import { generateInsights } from "@/lib/insights/insightEngine";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbSkinScanToScanResponse, type SkinScansRow } from "@/lib/supabase/scanMapper";
import type { DailyHabit, Product, UserProfile } from "@/lib/types";

function streakByDay(items: string[]): number {
  if (!items.length) return 0;
  const set = new Set(items);
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

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
  const userId = await getRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json(demoDashboardPayload());

  const [{ data: scans }, { data: habitsRaw }, { data: products }, { data: profile }, { data: am }, { data: pm }] =
    await Promise.all([
      supabase.from("skin_scans").select("*").eq("user_id", userId).order("scan_date", { ascending: true }),
      supabase.from("daily_habits").select("*").eq("user_id", userId).order("log_date", { ascending: true }),
      supabase.from("products").select("*").eq("user_id", userId),
      supabase.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("routine_steps")
        .select("instruction, routine_id, routines!inner(user_id, routine_type, is_active)")
        .eq("routines.user_id", userId)
        .eq("routines.routine_type", "AM")
        .eq("routines.is_active", true)
        .order("step_order", { ascending: true })
        .limit(4),
      supabase
        .from("routine_steps")
        .select("instruction, routine_id, routines!inner(user_id, routine_type, is_active)")
        .eq("routines.user_id", userId)
        .eq("routines.routine_type", "PM")
        .eq("routines.is_active", true)
        .order("step_order", { ascending: true })
        .limit(4),
    ]);

  const mappedScans = (scans ?? []).map((s) => dbSkinScanToScanResponse(s as SkinScansRow));
  const habits = (habitsRaw ?? []).map((h) => mapHabitRow(h as Record<string, unknown>));
  const latestScan = mappedScans.at(-1) ?? null;
  const todayHabits = habits.at(-1) ?? null;

  const insights = generateInsights({
    scans: mappedScans,
    habits,
    products: (products ?? []).map((p) => mapProductRow(p as Record<string, unknown>)),
    profile: profile ? mapProfileRow(profile as Record<string, unknown>) : undefined,
  });

  return NextResponse.json({
    latestScan,
    streaks: {
      spf: streakByDay(habits.filter((h) => h.usedSpf).map((h) => h.logDate)),
      routine: streakByDay(habits.map((h) => h.logDate)),
      scan: streakByDay(mappedScans.map((s) => s.scanDate)),
    },
    todayHabits,
    topInsight: insights[0] ?? null,
    activeRoutinePreview: {
      AM: (am ?? []).map((x) => String((x as Record<string, unknown>).instruction ?? "")).filter(Boolean),
      PM: (pm ?? []).map((x) => String((x as Record<string, unknown>).instruction ?? "")).filter(Boolean),
    },
  });
}
