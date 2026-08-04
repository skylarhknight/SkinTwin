import { NextResponse } from "next/server";
import { demoScan } from "@/lib/apiDemo";
import { getRequestUserId } from "@/lib/auth/serverAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbSkinScanToScanResponse, type SkinScansRow } from "@/lib/supabase/scanMapper";

export async function GET(request: Request) {
  const userId = await getRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("skin_scans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return NextResponse.json(dbSkinScanToScanResponse(data as SkinScansRow));
      }
      if (error) console.warn("[GET /api/scans/latest] query failed:", error.message);
    } catch (e) {
      console.warn("[GET /api/scans/latest] unexpected error:", e);
    }
  }
  /** No database means no scan history, so serve the demo scan instead of an empty dashboard. */
  if (!supabase) return NextResponse.json(demoScan());
  return NextResponse.json(null);
}
