import type { DailyHabit, Product, RoutineResponse, RoutineStep, SkinScan, UserProfile } from "../types";
import { WELLNESS_DISCLAIMER } from "../types";
import { mockProfile, mockScan } from "../mock/mockSkinData";

export type GenerateRoutineInput = {
  profile?: UserProfile;
  latestScan?: SkinScan;
  products?: Product[];
  habits?: DailyHabit[];
};

function makeStep(stepOrder: number, category: string, instruction: string, rationale: string, frequency?: string): RoutineStep {
  return { stepOrder, category, instruction, rationale, frequency };
}

function hasGoal(profile: UserProfile, goal: string): boolean {
  return profile.primaryGoals.includes(goal);
}

function averageSleep(habits: DailyHabit[]): number | undefined {
  if (!habits.length) return undefined;
  return habits.reduce((sum, habit) => sum + habit.sleepHours, 0) / habits.length;
}

export function generateRoutine(input: GenerateRoutineInput): RoutineResponse {
  const profile = input.profile ?? mockProfile;
  const scan = input.latestScan ?? mockScan;
  const habits = input.habits ?? [];
  const metrics = scan.metrics;
  const highSensitivity = profile.sensitivityLevel === "high";
  const avoidForNow: string[] = [];

  const amSteps: RoutineStep[] = [
    makeStep(1, "cleanser", "Use a gentle cleanser or rinse with water if skin feels dry.", "A low-irritation cleanse supports the skin barrier before treatment steps."),
  ];

  const pmSteps: RoutineStep[] = [
    makeStep(1, "cleanser", "Cleanse gently to remove SPF and daily buildup.", "Consistent cleansing helps reduce congestion without over-stripping."),
  ];

  if (metrics.pigmentation < 75 || hasGoal(profile, "fade_dark_spots")) {
    amSteps.push(
      makeStep(2, "brightening_serum", "Apply a brightening serum category such as vitamin C or niacinamide.", "Tone-focused ingredients can support the appearance of more even-looking skin.")
    );
  }

  if (metrics.hydration < 75 || hasGoal(profile, "improve_hydration")) {
    amSteps.push(
      makeStep(amSteps.length + 1, "moisturizer", "Apply a barrier-supporting moisturizer.", "Hydration is a priority area, so reinforce moisture before SPF.")
    );
    pmSteps.push(
      makeStep(pmSteps.length + 1, "hydrating_serum", "Use a hydrating serum or moisturizer with glycerin, hyaluronic acid, or ceramides.", "Hydration support is prioritized because your hydration score is below target.")
    );
  }

  if (metrics.redness < 75 || hasGoal(profile, "reduce_redness") || highSensitivity) {
    pmSteps.push(
      makeStep(pmSteps.length + 1, "barrier_repair", "Use a simple barrier-repair moisturizer tonight.", "Redness and sensitivity signals suggest avoiding unnecessary irritation.")
    );
    avoidForNow.push("Strong exfoliating acids", "Harsh scrubs", "Introducing multiple new active treatments at once");
  }

  if ((metrics.acne < 75 || metrics.oiliness < 65 || hasGoal(profile, "reduce_acne")) && !highSensitivity) {
    pmSteps.push(
      makeStep(pmSteps.length + 1, "acne_support", "Use a lightweight non-comedogenic treatment step if already tolerated.", "Oiliness or clarity signals may benefit from a simple congestion-focused step.", "2-3x/week")
    );
  }

  if (metrics.darkCircles < 72 && averageSleep(habits) !== undefined && (averageSleep(habits) as number) < 6.5) {
    pmSteps.push(
      makeStep(pmSteps.length + 1, "sleep_support", "Prioritize sleep consistency tonight before adding new eye-area actives.", "Recent low sleep may be contributing to the appearance of dark circles.")
    );
  }

  amSteps.push(
    makeStep(amSteps.length + 1, "spf", "Finish with broad-spectrum SPF every morning.", "SPF is the highest-leverage step for protecting tone, pigmentation, and long-term skin appearance.")
  );

  return {
    routines: [
      { routineType: "AM", steps: amSteps },
      { routineType: "PM", steps: pmSteps },
    ],
    avoidForNow: [...new Set(avoidForNow)],
    disclaimer: WELLNESS_DISCLAIMER,
  };
}
