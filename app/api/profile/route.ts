import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/serverAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureAppUser } from "@/lib/supabase/ensureAppUser";
import type { UserProfile } from "@/lib/types";

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
  const { data, error } = await supabase.from("user_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json(null);
  return NextResponse.json(mapProfileRow(data as Record<string, unknown>));
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  const ensured = await ensureAppUser(supabase, user);
  if (!ensured) return NextResponse.json({ error: "Could not prepare user record." }, { status: 500 });
  const profile = (await request.json().catch(() => ({}))) as Partial<UserProfile>;
  const payload = {
    user_id: userId,
    skin_type: profile.skinType ?? "unsure",
    sensitivity_level: profile.sensitivityLevel ?? "medium",
    routine_experience: profile.routineExperience ?? "beginner",
    budget_level: profile.budgetLevel ?? "$$",
    primary_goals: profile.primaryGoals ?? [],
    updated_at: new Date().toISOString(),
  };
  const { data: existing, error: readErr } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (existing?.id) {
    const { data, error } = await supabase
      .from("user_profiles")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ profile: mapProfileRow(data as Record<string, unknown>), status: "saved" });
  }
  const { data, error } = await supabase.from("user_profiles").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: mapProfileRow(data as Record<string, unknown>), status: "saved" });
}
