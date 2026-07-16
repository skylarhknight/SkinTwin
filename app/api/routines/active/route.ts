import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/auth/serverAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { RoutineResponse } from "@/lib/types";

export async function GET(request: Request) {
  const userId = await getRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const { data: routines, error } = await supabase
    .from("routines")
    .select("id,routine_type")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error || !routines?.length) return NextResponse.json({ routines: [] } as RoutineResponse);

  const out: RoutineResponse = { routines: [] };
  for (const r of routines) {
    const { data: steps } = await supabase
      .from("routine_steps")
      .select("*")
      .eq("routine_id", (r as Record<string, unknown>).id)
      .order("step_order", { ascending: true });
    out.routines.push({
      routineType: String((r as Record<string, unknown>).routine_type) as "AM" | "PM",
      steps: (steps ?? []).map((s) => ({
        stepOrder: Number((s as Record<string, unknown>).step_order ?? 0),
        category: String((s as Record<string, unknown>).category ?? ""),
        productId: ((s as Record<string, unknown>).product_id as string | undefined) ?? undefined,
        instruction: String((s as Record<string, unknown>).instruction ?? ""),
        rationale: String((s as Record<string, unknown>).rationale ?? ""),
        frequency: ((s as Record<string, unknown>).frequency as string | undefined) ?? undefined,
      })),
    });
  }
  return NextResponse.json(out);
}
