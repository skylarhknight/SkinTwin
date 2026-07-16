import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/auth/serverAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbSkinScanToScanResponse, type SkinScansRow } from "@/lib/supabase/scanMapper";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const userId = await getRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = params.id;

  const supabase = getSupabaseAdminClient();

  if (supabase && UUID_RE.test(id)) {
    try {
      const { data, error } = await supabase
        .from("skin_scans")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.warn("[GET /api/scans/[id]] query failed:", error.message);
        return NextResponse.json({ error: "scan lookup failed" }, { status: 500 });
      }
      if (data) {
        return NextResponse.json(dbSkinScanToScanResponse(data as SkinScansRow));
      }
      return NextResponse.json({ error: "scan not found" }, { status: 404 });
    } catch (e) {
      console.warn("[GET /api/scans/[id]] unexpected error:", e);
      return NextResponse.json({ error: "scan lookup failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "invalid scan id" }, { status: 400 });
}
