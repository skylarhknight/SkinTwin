import type { DailyHabit, Insight, Product, RoutineResponse, SkinScan, UserProfile } from "./types";
import { DEMO_USER_ID } from "./demoUser";
import { generateInsights } from "./insights/insightEngine";
import { mockProfile, mockSkinMetrics } from "./mock/mockSkinData";
import { generateRoutine } from "./recommendations/routineEngine";
import { calculateOverallScore, getTopConcerns } from "./skin/skinScore";

export const demoScan = (imageUrl = "/mock/skin-scan-placeholder.svg"): SkinScan => ({
  id: `scan-${Date.now()}`,
  userId: DEMO_USER_ID,
  imageUrl,
  scanDate: new Date().toISOString().slice(0, 10),
  overallScore: calculateOverallScore(mockSkinMetrics),
  metrics: mockSkinMetrics,
  topConcerns: getTopConcerns(mockSkinMetrics),
  summary: "Hydration, dark circles, and pigmentation are the top areas to watch in this demo scan.",
  isMock: true
});

export const demoProfile = mockProfile as UserProfile;
export const demoProducts: Product[] = [{ id: "product-vitc", name: "Vitamin C Serum", brand: "Demo Derm", category: "serum", activeIngredients: ["vitamin_c", "niacinamide"], usageTime: "AM", frequency: "daily", dateStarted: new Date(Date.now() - 86400000 * 10).toISOString().slice(0,10) }];
export const demoHabits: DailyHabit[] = [{ logDate: new Date().toISOString().slice(0,10), waterIntakeMl: 1600, sleepHours: 6.2, usedSpf: true, stressLevel: 4, exerciseMinutes: 20, notes: "Demo log" }];

/**
 * Shown in API responses served without Supabase, so the UI can label the data
 * honestly instead of presenting demo numbers as live ones (CONTRACT §7).
 */
export const DEMO_MODE_NOTE =
  "Supabase is not configured in this environment, so this is demo data.";

/** Deterministic demo corpus the engines run against when there is no database. */
function demoContext() {
  const scan = demoScan();
  return {
    scans: [scan],
    habits: demoHabits,
    products: demoProducts,
    profile: demoProfile,
    latestScan: scan,
  };
}

export function demoInsights(): Insight[] {
  const { scans, habits, products, profile } = demoContext();
  return generateInsights({ scans, habits, products, profile });
}

export function demoRoutine(): RoutineResponse {
  const { latestScan, habits, products, profile } = demoContext();
  return generateRoutine({ latestScan, habits, products, profile });
}

export function demoDashboardPayload() {
  const { latestScan } = demoContext();
  const routine = demoRoutine();
  const previewFor = (type: "AM" | "PM") =>
    (routine.routines.find((r) => r.routineType === type)?.steps ?? [])
      .slice(0, 4)
      .map((s) => s.instruction);

  return {
    latestScan,
    streaks: { spf: 1, routine: 1, scan: 1 },
    todayHabits: demoHabits.at(-1) ?? null,
    topInsight: demoInsights()[0] ?? null,
    activeRoutinePreview: { AM: previewFor("AM"), PM: previewFor("PM") },
    isMock: true,
    mockFallbackNote: DEMO_MODE_NOTE,
  };
}
