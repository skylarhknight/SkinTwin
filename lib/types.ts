export type SkinMetrics = {
  hydration: number;
  redness: number;
  acne: number;
  pores: number;
  texture: number;
  wrinkles: number;
  darkCircles: number;
  pigmentation: number;
  radiance: number;
  oiliness: number;
};

export type FacialToneData = {
  undertone: "warm" | "cool" | "neutral" | "olive" | string;
  pigmentationIndex: number;
  rednessIndex: number;
};

export type UserProfile = {
  skinType: "dry" | "oily" | "combination" | "normal" | "unsure";
  sensitivityLevel: "low" | "medium" | "high";
  routineExperience: "beginner" | "intermediate" | "advanced";
  budgetLevel: "$" | "$$" | "$$$";
  primaryGoals: string[];
};

export type DailyHabit = {
  logDate: string;
  waterIntakeMl: number;
  sleepHours: number;
  usedSpf: boolean;
  stressLevel: 1 | 2 | 3 | 4 | 5;
  exerciseMinutes?: number;
  notes?: string;
};

export type Product = {
  id: string;
  name: string;
  brand?: string;
  category: string;
  activeIngredients: string[];
  usageTime: "AM" | "PM" | "Both";
  frequency: string;
  dateStarted: string;
  dateStopped?: string;
  notes?: string;
};

export type SkinScan = {
  id: string;
  userId?: string;
  imageUrl: string;
  scanDate: string;
  overallScore: number;
  metrics: SkinMetrics;
  topConcerns: string[];
  summary?: string;
  isMock: boolean;
  /** Which dimensions Perfect returned for this scan (others may be neutral placeholders). */
  analyzedMetricKeys?: (keyof SkinMetrics)[];
  /** Set when real analysis failed and metrics are placeholders */
  mockFallbackNote?: string;
  facialToneData?: FacialToneData;
  rawSkinAnalysisResponse?: unknown;
  rawColorToneResponse?: unknown;
};

export type RoutineStep = {
  stepOrder: number;
  category: string;
  productId?: string;
  instruction: string;
  rationale: string;
  frequency?: string;
};

export type RoutineResponse = {
  routines: {
    routineType: "AM" | "PM";
    steps: RoutineStep[];
  }[];
  avoidForNow?: string[];
  disclaimer?: string;
};

export type Insight = {
  id?: string;
  insightType: string;
  title: string;
  description: string;
  evidence: string[] | Record<string, unknown>;
  recommendedAction: string;
  confidence: "low" | "medium" | "high";
  severity?: "low" | "medium" | "high";
};

export type SimulationScenario =
  | "consistent_spf_routine"
  | "skip_spf"
  | "stop_routine"
  | "current_trajectory";

export type SimulationResponse = {
  simulationId: string;
  scenarioType: SimulationScenario;
  sourceImageUrl: string;
  simulatedImageUrl: string;
  scenarioDescription: string;
  simulationYears: number;
  isMock: boolean;
  /** When isMock: why we fell back (safe to show in UI). */
  mockFallbackNote?: string;
};

export const WELLNESS_DISCLAIMER =
  "SkinTwin provides wellness and skincare guidance only. It does not diagnose, treat, or prevent medical conditions. For persistent or severe skin concerns, consult a licensed dermatologist.";
