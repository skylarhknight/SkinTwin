import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/auth/serverAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const userId = await getRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("daily_habits")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", today)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}
