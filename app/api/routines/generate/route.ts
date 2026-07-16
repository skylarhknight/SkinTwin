import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/serverAuth";
import { generateRoutine } from "@/lib/recommendations/routineEngine";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureAppUser } from "@/lib/supabase/ensureAppUser";
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

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  const ensured = await ensureAppUser(supabase, user);
  if (!ensured) return NextResponse.json({ error: "Could not prepare user record." }, { status: 500 });

  const [{ data: scans }, { data: habits }, { data: products }, { data: profile }] = await Promise.all([
    supabase.from("skin_scans").select("*").eq("user_id", userId).order("scan_date", { ascending: true }),
    supabase.from("daily_habits").select("*").eq("user_id", userId).order("log_date", { ascending: true }),
    supabase.from("products").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  const generated = generateRoutine({
    profile: profile ? mapProfileRow(profile as Record<string, unknown>) : undefined,
    latestScan: scans?.length ? dbSkinScanToScanResponse(scans.at(-1) as SkinScansRow) : undefined,
    products: (products ?? []).map((p) => mapProductRow(p as Record<string, unknown>)),
    habits: (habits ?? []).map((h) => mapHabitRow(h as Record<string, unknown>)),
  });

  // Mark previous active routines inactive, then save new version.
  await supabase.from("routines").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);
  for (const r of generated.routines) {
    const { data: routineRow, error: routineErr } = await supabase
      .from("routines")
      .insert({
        user_id: userId,
        routine_type: r.routineType,
        rationale: "Generated from latest scan, profile, habits, and products.",
        is_active: true,
      })
      .select("id")
      .single();
    if (routineErr || !routineRow?.id) continue;
    const steps = r.steps.map((s) => ({
      routine_id: routineRow.id,
      step_order: s.stepOrder,
      category: s.category,
      instruction: s.instruction,
      rationale: s.rationale,
      frequency: s.frequency ?? null,
    }));
    if (steps.length) await supabase.from("routine_steps").insert(steps);
  }

  return NextResponse.json(generated);
}
