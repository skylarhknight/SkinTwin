import { NextResponse } from "next/server";
import { getRequestUserId } from "@/lib/auth/serverAuth";
import { simulateAging } from "@/lib/perfect/perfectClient";

/** Skin simulation polls Perfect for up to ~72s plus uploads; allow headroom on serverless. */
export const maxDuration = 300;

export async function POST(request: Request) {
  const userId = await getRequestUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(
    await simulateAging({
      sourceImageUrl: body.sourceImageUrl,
      scenarioType: body.scenarioType ?? "consistent_spf_routine",
      simulationYears: body.simulationYears ?? 20,
    })
  );
}
export async function GET() { return NextResponse.json({ simulations: [] }); }
