import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/serverAuth";
import { calculateOverallScore, getTopConcerns } from "@/lib/skin/skinScore";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureAppUser } from "@/lib/supabase/ensureAppUser";
import type { SkinMetrics } from "@/lib/types";

/**
 * Seeds the authenticated user with a realistic 14-day baseline so judges can experience
 * the full app (dashboard, trends, insights, routine, recommendations) in one click —
 * no camera or selfie required.
 *
 * Idempotent: deletes existing demo rows for the user (is_mock = true) before reseeding.
 */
export const maxDuration = 30;

const DEMO_PROFILE = {
  skin_type: "combination",
  sensitivity_level: "medium",
  routine_experience: "intermediate",
  budget_level: "$$",
  primary_goals: ["fade_dark_spots", "improve_hydration", "build_consistency"],
};

const DEMO_PRODUCTS = [
  {
    name: "Hydrating Facial Cleanser",
    brand: "CeraVe",
    category: "cleanser",
    active_ingredients: ["ceramides", "hyaluronic acid"],
    usage_time: "Both",
    frequency: "daily",
  },
  {
    name: "Niacinamide 10% + Zinc 1%",
    brand: "The Ordinary",
    category: "serum",
    active_ingredients: ["niacinamide", "zinc"],
    usage_time: "AM",
    frequency: "daily",
  },
  {
    name: "Hydro Boost Water Gel",
    brand: "Neutrogena",
    category: "moisturizer",
    active_ingredients: ["hyaluronic acid"],
    usage_time: "Both",
    frequency: "daily",
  },
  {
    name: "Unseen Sunscreen SPF 40",
    brand: "Supergoop!",
    category: "sunscreen",
    active_ingredients: ["broad spectrum", "antioxidants"],
    usage_time: "AM",
    frequency: "daily",
  },
];

/** Drift values around a base with a small amount of jitter so trend lines look organic. */
function jitter(base: number, day: number, range = 4): number {
  const wave = Math.sin(day * 0.7) * range * 0.6;
  const noise = (Math.sin(day * 2.1) + Math.cos(day * 1.3)) * range * 0.4;
  return Math.max(35, Math.min(95, Math.round(base + wave + noise)));
}

function buildMetricsForDay(day: number, totalDays: number): SkinMetrics {
  /** Trend the user upward slightly over time to make trends rewarding. */
  const trend = (day / totalDays) * 6;
  return {
    hydration: jitter(64 + trend, day),
    redness: jitter(72 + trend * 0.4, day + 11),
    acne: jitter(78, day + 3),
    pores: jitter(70, day + 5),
    texture: jitter(74 + trend * 0.5, day + 9),
    wrinkles: jitter(80, day + 1),
    darkCircles: jitter(62, day + 6),
    pigmentation: jitter(60 + trend, day + 7),
    radiance: jitter(70 + trend * 0.7, day + 4),
    oiliness: jitter(68, day + 8),
  };
}

function dateNDaysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const ensured = await ensureAppUser(supabase, user);
  if (!ensured) return NextResponse.json({ error: "Could not prepare user record." }, { status: 500 });

  /** Wipe any prior demo data for this user so seeding is idempotent. */
  await supabase.from("skin_scans").delete().eq("user_id", userId).eq("is_mock", true);
  await supabase.from("daily_habits").delete().eq("user_id", userId);
  await supabase.from("products").delete().eq("user_id", userId);
  await supabase.from("user_profiles").delete().eq("user_id", userId);

  /** Profile. */
  await supabase.from("user_profiles").insert({ user_id: userId, ...DEMO_PROFILE });

  /** Products. */
  await supabase.from("products").insert(
    DEMO_PRODUCTS.map((p) => ({
      user_id: userId,
      ...p,
      date_started: dateNDaysAgoISO(20),
    }))
  );

  /** 14 days of habits with realistic patterns (occasionally missed SPF, sleep dips). */
  const habitRows = Array.from({ length: 14 }).map((_, i) => {
    const daysAgo = 13 - i;
    const missedSpf = i === 4 || i === 9;
    const lowSleep = i === 5 || i === 11;
    return {
      user_id: userId,
      log_date: dateNDaysAgoISO(daysAgo),
      water_intake_ml: 1500 + ((i * 137) % 600),
      sleep_hours: lowSleep ? 5.5 : 7 + ((i % 3) * 0.4),
      used_spf: !missedSpf,
      stress_level: ((i % 4) + 2) as 2 | 3 | 4 | 5,
      exercise_minutes: i % 2 === 0 ? 25 : 0,
      notes: null,
      updated_at: new Date().toISOString(),
    };
  });
  await supabase.from("daily_habits").insert(habitRows);

  /** 6 scans across 14 days (every ~2-3 days). Last scan = today. */
  const scanOffsets = [13, 11, 8, 5, 2, 0];
  const scanRows = scanOffsets.map((daysAgo, idx) => {
    const metrics = buildMetricsForDay(idx, scanOffsets.length - 1);
    const overall = calculateOverallScore(metrics);
    const top = getTopConcerns(metrics, 3);
    return {
      user_id: userId,
      image_url: "/mock/skin-scan-placeholder.svg",
      scan_date: dateNDaysAgoISO(daysAgo),
      overall_score: overall,
      hydration_score: metrics.hydration,
      redness_score: metrics.redness,
      acne_score: metrics.acne,
      pore_score: metrics.pores,
      texture_score: metrics.texture,
      wrinkle_score: metrics.wrinkles,
      dark_circle_score: metrics.darkCircles,
      pigmentation_score: metrics.pigmentation,
      radiance_score: metrics.radiance,
      oiliness_score: metrics.oiliness,
      top_concerns: top,
      facial_tone_data: {
        undertone: "neutral",
        pigmentationIndex: metrics.pigmentation,
        rednessIndex: metrics.redness,
      },
      raw_skin_analysis_response: { provider: "demo-seed" },
      raw_color_tone_response: { provider: "demo-seed" },
      is_mock: true,
    };
  });
  await supabase.from("skin_scans").insert(scanRows);

  return NextResponse.json({ status: "seeded", scans: scanRows.length, habits: habitRows.length });
}

export async function DELETE(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  await supabase.from("skin_scans").delete().eq("user_id", userId).eq("is_mock", true);
  await supabase.from("daily_habits").delete().eq("user_id", userId);
  await supabase.from("products").delete().eq("user_id", userId);
  await supabase.from("user_profiles").delete().eq("user_id", userId);
  return NextResponse.json({ status: "cleared" });
}
