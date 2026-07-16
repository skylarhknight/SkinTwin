import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/auth/serverAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const userId = await getRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({
    id: data.user.id,
    email: data.user.email,
    fullName: String(data.user.user_metadata?.full_name ?? ""),
  });
}
