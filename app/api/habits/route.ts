import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/serverAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureAppUser } from "@/lib/supabase/ensureAppUser";
import type { DailyHabit } from "@/lib/types";

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

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  const { data, error } = await supabase
    .from("daily_habits")
    .select("*")
    .eq("user_id", userId)
    .order("log_date", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ habits: (data ?? []).map((r) => mapHabitRow(r as Record<string, unknown>)) });
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  const ensured = await ensureAppUser(supabase, user);
  if (!ensured) return NextResponse.json({ error: "Could not prepare user record." }, { status: 500 });
  const habit = (await request.json().catch(() => ({}))) as Partial<DailyHabit>;
  if (!habit.logDate) return NextResponse.json({ error: "logDate is required" }, { status: 400 });
  const payload = {
    user_id: userId,
    log_date: habit.logDate,
    water_intake_ml: Number(habit.waterIntakeMl ?? 0),
    sleep_hours: Number(habit.sleepHours ?? 0),
    used_spf: Boolean(habit.usedSpf),
    stress_level: Number(habit.stressLevel ?? 3),
    exercise_minutes: habit.exerciseMinutes == null ? null : Number(habit.exerciseMinutes),
    notes: habit.notes ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("daily_habits")
    .upsert(payload, { onConflict: "user_id,log_date" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ habit: mapHabitRow(data as Record<string, unknown>), status: "saved" });
}
