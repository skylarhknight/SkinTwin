import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/serverAuth";
import { simulateAging } from "@/lib/perfect/perfectClient";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureAppUser } from "@/lib/supabase/ensureAppUser";
import { persistSimulation, readSimulations } from "@/lib/supabase/simulationStore";

/** Skin simulation polls Perfect for up to ~72s plus uploads; allow headroom on serverless. */
export const maxDuration = 300;

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  const simulation = await simulateAging({
    sourceImageUrl: body.sourceImageUrl,
    scenarioType: body.scenarioType ?? "consistent_spf_routine",
    simulationYears: body.simulationYears ?? 20,
  });

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json(simulation);

  const ensured = await ensureAppUser(supabase, user);
  if (!ensured) {
    console.warn("[POST /api/simulations] could not prepare user record; returning unpersisted result");
    return NextResponse.json(simulation);
  }

  return NextResponse.json(
    await persistSimulation(supabase, user.id, simulation, {
      sourceScanId: body.sourceScanId ?? null,
    })
  );
}

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ simulations: [] });
  return NextResponse.json({ simulations: await readSimulations(supabase, user.id) });
}
