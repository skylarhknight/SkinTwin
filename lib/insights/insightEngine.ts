import type { DailyHabit, Insight, Product, SkinScan, UserProfile } from "../types";
import { mockHabits, mockInsights, mockProducts, mockProfile, mockScan } from "../mock/mockSkinData";

export type GenerateInsightsInput = {
  scans?: SkinScan[];
  habits?: DailyHabit[];
  products?: Product[];
  profile?: UserProfile;
};

const LOW_SLEEP_THRESHOLD = 6.5;
const WATER_GOAL_ML = 2000;

function average(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isRecentlyStarted(product: Product, days = 14): boolean {
  const started = new Date(product.dateStarted).getTime();
  if (Number.isNaN(started)) return false;
  const now = Date.now();
  return now - started <= days * 24 * 60 * 60 * 1000;
}

function isActiveProduct(product: Product): boolean {
  const text = `${product.category} ${product.activeIngredients.join(" ")}`.toLowerCase();
  return ["aha", "bha", "retinol", "retinoid", "exfoliant"].some((term) => text.includes(term));
}

export function generateInsights(input: GenerateInsightsInput): Insight[] {
  const hasRealInputs = Boolean(input.scans?.length || input.habits?.length || input.products?.length || input.profile);
  const scans = input.scans?.length ? input.scans : hasRealInputs ? [] : [mockScan];
  const habits = input.habits?.length ? input.habits : hasRealInputs ? [] : mockHabits;
  const products = input.products?.length ? input.products : hasRealInputs ? [] : mockProducts;
  const profile = input.profile ?? (hasRealInputs ? { ...mockProfile, primaryGoals: [] } : mockProfile);
  const latestScan = scans[scans.length - 1];

  if (!latestScan) return hasRealInputs ? [] : mockInsights;

  const insights: Insight[] = [];
  const avgSleep = average(habits.map((habit) => habit.sleepHours));
  const avgWater = average(habits.map((habit) => habit.waterIntakeMl));
  const missedSpfCount = habits.filter((habit) => !habit.usedSpf).length;

  if ((avgSleep ?? 99) < LOW_SLEEP_THRESHOLD && latestScan.metrics.darkCircles < 75) {
    insights.push({
      insightType: "habit_correlation",
      title: "Low sleep may be affecting dark circles.",
      description: "Your recent sleep average is below target while dark circles are one of your lower scores.",
      evidence: [
        `Average sleep: ${(avgSleep ?? 0).toFixed(1)} hours`,
        `Dark circle score: ${latestScan.metrics.darkCircles}/100`,
      ],
      recommendedAction: "Aim for 7+ hours of sleep for the next three nights and compare your next scan.",
      confidence: "medium",
    });
  }

  if (missedSpfCount >= 3 && latestScan.metrics.pigmentation < 75) {
    insights.push({
      insightType: "spf_consistency",
      title: "Missed SPF may increase pigmentation risk.",
      description: "SPF was missed several times while pigmentation remains a priority area.",
      evidence: [`Missed SPF days: ${missedSpfCount}`, `Pigmentation score: ${latestScan.metrics.pigmentation}/100`],
      recommendedAction: "Keep SPF as the final step of your morning routine every day this week.",
      confidence: "high",
    });
  } else if (profile.primaryGoals.includes("fade_dark_spots") || latestScan.metrics.pigmentation < 75) {
    insights.push({
      insightType: "spf_consistency",
      title: "SPF consistency supports tone progress.",
      description: "Tone and pigmentation goals depend heavily on consistent sun protection.",
      evidence: [`Pigmentation score: ${latestScan.metrics.pigmentation}/100`, "Fade dark spots is a selected goal or current priority."],
      recommendedAction: "Use daily SPF and re-scan weekly to monitor tone changes.",
      confidence: "medium",
    });
  }

  const recentActive = products.find((product) => isRecentlyStarted(product) && isActiveProduct(product));
  if (recentActive && latestScan.metrics.redness < 75) {
    insights.push({
      insightType: "product_trigger",
      title: "New product may be contributing to redness.",
      description: `${recentActive.name} was introduced recently and contains an active/exfoliating signal.`,
      evidence: [`Product started: ${recentActive.dateStarted}`, `Redness score: ${latestScan.metrics.redness}/100`],
      recommendedAction: "Consider pausing or reducing active frequency if redness continues to rise.",
      confidence: "low",
    });
  }

  if ((avgWater ?? WATER_GOAL_ML) < WATER_GOAL_ML && latestScan.metrics.hydration < 75) {
    insights.push({
      insightType: "hydration",
      title: "Low water intake may be affecting hydration.",
      description: "Recent water logs are below target while hydration is one of your lower scores.",
      evidence: [`Average water: ${Math.round(avgWater ?? 0)} ml`, `Hydration score: ${latestScan.metrics.hydration}/100`],
      recommendedAction: "Increase water intake toward 2L and use a barrier-supporting moisturizer tonight.",
      confidence: "medium",
    });
  }

  return insights.length ? insights : hasRealInputs ? [] : mockInsights;
}
