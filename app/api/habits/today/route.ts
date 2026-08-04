import { NextResponse } from "next/server";
import { demoHabits } from "@/lib/apiDemo";
import { getRequestUserId } from "@/lib/auth/serverAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const userId = await getRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  /** Live responses are raw DB rows, so the demo row keeps the same snake_case shape. */
  if (!supabase) {
    const h = demoHabits[0];
    return NextResponse.json({
      log_date: today,
      water_intake_ml: h.waterIntakeMl,
      sleep_hours: h.sleepHours,
      used_spf: h.usedSpf,
      stress_level: h.stressLevel,
      exercise_minutes: h.exerciseMinutes ?? null,
      notes: h.notes ?? null,
    });
  }
  const { data, error } = await supabase
    .from("daily_habits")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", today)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}
