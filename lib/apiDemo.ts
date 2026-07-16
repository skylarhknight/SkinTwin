import type { DailyHabit, Product, SkinScan, UserProfile } from "./types";
import { DEMO_USER_ID } from "./demoUser";
import { mockProfile, mockSkinMetrics } from "./mock/mockSkinData";
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
