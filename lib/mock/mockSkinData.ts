import type { DailyHabit, Insight, Product, SkinMetrics, SkinScan, UserProfile } from "../types";
import { calculateOverallScore, getTopConcerns } from "../skin/skinScore";

export const mockSkinMetrics: SkinMetrics = {
  hydration: 62,
  redness: 70,
  acne: 84,
  pores: 76,
  texture: 82,
  wrinkles: 88,
  darkCircles: 66,
  pigmentation: 68,
  radiance: 74,
  oiliness: 58,
};

export const mockProfile: UserProfile = {
  skinType: "combination",
  sensitivityLevel: "high",
  routineExperience: "beginner",
  budgetLevel: "$$",
  primaryGoals: ["reduce_redness", "fade_dark_spots", "improve_hydration"],
};

export const mockProducts: Product[] = [
  {
    id: "mock-product-cleanser",
    name: "Gentle Hydrating Cleanser",
    brand: "Demo Derm",
    category: "cleanser",
    activeIngredients: ["glycerin"],
    usageTime: "Both",
    frequency: "daily",
    dateStarted: "2026-04-01",
  },
  {
    id: "mock-product-vitamin-c",
    name: "Brightening Vitamin C Serum",
    brand: "Demo Derm",
    category: "serum",
    activeIngredients: ["vitamin_c", "niacinamide"],
    usageTime: "AM",
    frequency: "daily",
    dateStarted: "2026-04-10",
  },
  {
    id: "mock-product-exfoliant",
    name: "AHA Resurfacing Treatment",
    brand: "Demo Derm",
    category: "exfoliant",
    activeIngredients: ["aha"],
    usageTime: "PM",
    frequency: "2x_week",
    dateStarted: "2026-04-22",
  },
];

export const mockHabits: DailyHabit[] = [
  { logDate: "2026-04-24", waterIntakeMl: 1500, sleepHours: 6.1, usedSpf: true, stressLevel: 4 },
  { logDate: "2026-04-25", waterIntakeMl: 1700, sleepHours: 5.8, usedSpf: false, stressLevel: 4 },
  { logDate: "2026-04-26", waterIntakeMl: 1400, sleepHours: 6.3, usedSpf: true, stressLevel: 3 },
];

export const mockScan: SkinScan = {
  id: "mock-scan-latest",
  imageUrl: "/mock/skin-scan-placeholder.svg",
  scanDate: "2026-04-27",
  metrics: mockSkinMetrics,
  overallScore: calculateOverallScore(mockSkinMetrics),
  topConcerns: getTopConcerns(mockSkinMetrics),
  summary: "Hydration, dark circles, and pigmentation are the current priority areas.",
  isMock: true,
};

export const mockInsights: Insight[] = [
  {
    insightType: "habit_correlation",
    title: "Low sleep may be affecting dark circles.",
    description: "Dark circle score is a priority area and recent sleep logs are below the 7-hour target.",
    evidence: ["Average sleep is below 6.5 hours", "Dark circles are among the lowest skin scores"],
    recommendedAction: "Aim for 7+ hours of sleep for the next three nights and monitor your next scan.",
    confidence: "medium",
  },
  {
    insightType: "spf_consistency",
    title: "SPF consistency is supporting tone improvement.",
    description: "Daily SPF is the highest-leverage habit for protecting tone and pigmentation progress.",
    evidence: ["Pigmentation is a selected goal", "Recent habit logs include SPF usage"],
    recommendedAction: "Keep SPF in the final step of your morning routine every day.",
    confidence: "medium",
  },
  {
    insightType: "product_trigger",
    title: "Possible irritation from new exfoliant.",
    description: "A recently introduced exfoliant can contribute to temporary redness or barrier stress.",
    evidence: ["AHA treatment started recently", "Redness is a current priority"],
    recommendedAction: "Pause exfoliation for 48 hours if redness increases, then reintroduce slowly.",
    confidence: "low",
  },
];
