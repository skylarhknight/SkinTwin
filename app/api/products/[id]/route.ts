import { NextResponse } from "next/server";
import { DEMO_MODE_NOTE } from "@/lib/apiDemo";
import { getRequestUserId } from "@/lib/auth/serverAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const userId = await getRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdminClient();
  const patch = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  /** Demo mode has nowhere to persist to; echo the patch back so the UI still advances. */
  if (!supabase) {
    return NextResponse.json({
      product: { ...patch, id: params.id },
      status: "updated",
      isMock: true,
      mockFallbackNote: DEMO_MODE_NOTE,
    });
  }
  const { data, error } = await supabase
    .from("products")
    .update({
      name: patch.name,
      brand: patch.brand,
      category: patch.category,
      active_ingredients: patch.activeIngredients,
      usage_time: patch.usageTime,
      frequency: patch.frequency,
      date_started: patch.dateStarted,
      date_stopped: patch.dateStopped,
      notes: patch.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product: data, status: "updated" });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const userId = await getRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ id: params.id, status: "deleted", isMock: true, mockFallbackNote: DEMO_MODE_NOTE });
  }
  const { error } = await supabase.from("products").delete().eq("id", params.id).eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: params.id, status: "deleted" });
}
