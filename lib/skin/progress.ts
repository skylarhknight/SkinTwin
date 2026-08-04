import type { DailyHabit, Product, SkinMetrics, SkinScan } from "@/lib/types";
import { metricLabel } from "@/lib/skin/metricLabels";

/**
 * Perfect's scores carry run-to-run noise from lighting and framing, so a small delta is not
 * evidence of anything. Anything inside this band is reported as "held steady" rather than a trend.
 */
export const MEANINGFUL_DELTA = 3;

export type MetricDelta = {
  key: keyof SkinMetrics;
  label: string;
  before: number;
  after: number;
  delta: number;
  direction: "improved" | "declined" | "steady";
};

export type AdherenceSummary = {
  daysInWindow: number;
  daysLogged: number;
  logRate: number;
  spfDays: number;
  spfRate: number;
  avgSleep?: number;
  avgWater?: number;
  avgStress?: number;
};

export type Attribution = {
  metricKey: keyof SkinMetrics;
  headline: string;
  detail: string;
  evidence: string[];
  /** How much this link is worth trusting given window length and adherence data. */
  confidence: "low" | "medium" | "high";
};

export type ProgressReport = {
  before: SkinScan;
  after: SkinScan;
  daysBetween: number;
  overallDelta: number;
  /** Only metrics Perfect measured in BOTH scans — anything else is not comparable. */
  metricDeltas: MetricDelta[];
  /** Measured in one scan but not the other, so deliberately excluded from the comparison. */
  notComparable: { key: keyof SkinMetrics; label: string }[];
  adherence: AdherenceSummary | null;
  productsStarted: Product[];
  productsRunning: Product[];
  productsStopped: Product[];
  attributions: Attribution[];
  verdict: string;
};

function dayNumber(date: string): number {
  return Math.floor(new Date(`${date.slice(0, 10)}T00:00:00Z`).getTime() / 86_400_000);
}

function average(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function comparableKeys(before: SkinScan, after: SkinScan): (keyof SkinMetrics)[] {
  const all = Object.keys(after.metrics) as (keyof SkinMetrics)[];
  // A scan with no analyzedMetricKeys is demo data, where every metric is populated.
  const beforeKeys = before.analyzedMetricKeys?.length ? new Set(before.analyzedMetricKeys) : new Set(all);
  const afterKeys = after.analyzedMetricKeys?.length ? new Set(after.analyzedMetricKeys) : new Set(all);
  return all.filter((k) => beforeKeys.has(k) && afterKeys.has(k));
}

function directionOf(delta: number): MetricDelta["direction"] {
  if (delta >= MEANINGFUL_DELTA) return "improved";
  if (delta <= -MEANINGFUL_DELTA) return "declined";
  return "steady";
}

function summarizeAdherence(habits: DailyHabit[], startDate: string, endDate: string): AdherenceSummary | null {
  const start = dayNumber(startDate);
  const end = dayNumber(endDate);
  const inWindow = habits.filter((h) => {
    const d = dayNumber(h.logDate);
    return d >= start && d <= end;
  });
  if (!inWindow.length) return null;

  const daysInWindow = Math.max(1, end - start);
  const spfDays = inWindow.filter((h) => h.usedSpf).length;

  return {
    daysInWindow,
    daysLogged: inWindow.length,
    logRate: Math.round((inWindow.length / daysInWindow) * 100),
    spfDays,
    spfRate: Math.round((spfDays / inWindow.length) * 100),
    avgSleep: average(inWindow.map((h) => h.sleepHours)),
    avgWater: average(inWindow.map((h) => h.waterIntakeMl)),
    avgStress: average(inWindow.map((h) => h.stressLevel)),
  };
}

/** Ingredient families with a well-established link to a given metric, used for product attribution. */
const INGREDIENT_TARGETS: { match: string[]; metric: keyof SkinMetrics; label: string }[] = [
  { match: ["retinol", "retinoid", "tretinoin", "adapalene"], metric: "wrinkles", label: "retinoid" },
  { match: ["vitamin c", "ascorbic", "ascorbate"], metric: "pigmentation", label: "vitamin C" },
  { match: ["niacinamide"], metric: "pores", label: "niacinamide" },
  { match: ["hyaluronic", "glycerin", "ceramide", "squalane"], metric: "hydration", label: "humectant/barrier" },
  { match: ["salicylic", "bha", "benzoyl"], metric: "acne", label: "acne active" },
  { match: ["glycolic", "lactic", "aha", "mandelic"], metric: "texture", label: "AHA" },
  { match: ["centella", "cica", "azelaic", "panthenol"], metric: "redness", label: "soothing active" },
  { match: ["caffeine", "peptide"], metric: "darkCircles", label: "eye active" },
];

function productTargets(product: Product): { metric: keyof SkinMetrics; label: string }[] {
  const haystack = `${product.name} ${product.category} ${product.activeIngredients.join(" ")}`.toLowerCase();
  return INGREDIENT_TARGETS.filter((t) => t.match.some((m) => haystack.includes(m))).map((t) => ({
    metric: t.metric,
    label: t.label,
  }));
}

/**
 * Confidence is capped by how much the window can actually support: a three-day gap or a barely
 * logged window cannot carry a strong claim no matter how large the metric move is.
 */
function gradeConfidence(daysBetween: number, adherence: AdherenceSummary | null): "low" | "medium" | "high" {
  if (daysBetween < 14 || !adherence) return "low";
  if (daysBetween >= 28 && adherence.logRate >= 60) return "high";
  return "medium";
}

function buildAttributions(
  deltas: MetricDelta[],
  adherence: AdherenceSummary | null,
  productsStarted: Product[],
  productsRunning: Product[],
  daysBetween: number
): Attribution[] {
  const out: Attribution[] = [];
  const baseConfidence = gradeConfidence(daysBetween, adherence);
  const byKey = new Map(deltas.map((d) => [d.key, d]));

  // Habit links — SPF against the two metrics it plausibly moves.
  if (adherence) {
    for (const key of ["pigmentation", "wrinkles"] as (keyof SkinMetrics)[]) {
      const d = byKey.get(key);
      if (!d || d.direction === "steady") continue;
      const consistent = adherence.spfRate >= 70 && d.direction === "improved";
      const inconsistent = adherence.spfRate < 40 && d.direction === "declined";
      if (!consistent && !inconsistent) continue;
      out.push({
        metricKey: key,
        headline: consistent
          ? `${d.label} improved on ${adherence.spfRate}% SPF adherence`
          : `${d.label} declined on ${adherence.spfRate}% SPF adherence`,
        detail: consistent
          ? `You wore SPF on ${adherence.spfDays} of ${adherence.daysLogged} logged days, and ${d.label.toLowerCase()} moved ${d.delta > 0 ? "+" : ""}${d.delta} points over this window.`
          : `SPF was logged on only ${adherence.spfDays} of ${adherence.daysLogged} days, and ${d.label.toLowerCase()} moved ${d.delta} points over this window.`,
        evidence: [
          `SPF adherence: ${adherence.spfRate}% (${adherence.spfDays}/${adherence.daysLogged} days)`,
          `${d.label}: ${d.before} → ${d.after} (${d.delta > 0 ? "+" : ""}${d.delta})`,
          `Window: ${daysBetween} days`,
        ],
        confidence: baseConfidence,
      });
    }

    const dark = byKey.get("darkCircles");
    if (dark && dark.direction !== "steady" && adherence.avgSleep !== undefined) {
      const consistent = adherence.avgSleep >= 7 && dark.direction === "improved";
      const inconsistent = adherence.avgSleep < 6.5 && dark.direction === "declined";
      if (consistent || inconsistent) {
        out.push({
          metricKey: "darkCircles",
          headline: `Dark circles ${dark.direction} on ${adherence.avgSleep.toFixed(1)}h average sleep`,
          detail: `Across ${adherence.daysLogged} logged days you averaged ${adherence.avgSleep.toFixed(1)} hours of sleep, and dark circles moved ${dark.delta > 0 ? "+" : ""}${dark.delta} points.`,
          evidence: [
            `Average sleep: ${adherence.avgSleep.toFixed(1)}h`,
            `Dark circles: ${dark.before} → ${dark.after} (${dark.delta > 0 ? "+" : ""}${dark.delta})`,
          ],
          confidence: baseConfidence,
        });
      }
    }
  }

  // Product links — only where the product was in use for the window and its target metric moved.
  for (const product of [...productsStarted, ...productsRunning]) {
    for (const target of productTargets(product)) {
      const d = byKey.get(target.metric);
      if (!d || d.direction === "steady") continue;
      if (out.some((a) => a.metricKey === target.metric && a.headline.includes(product.name))) continue;
      out.push({
        metricKey: target.metric,
        headline: `${product.name} was running while ${d.label.toLowerCase()} ${d.direction}`,
        detail: `${product.name} contains a ${target.label}, which targets ${d.label.toLowerCase()}. Over this window ${d.label.toLowerCase()} moved ${d.delta > 0 ? "+" : ""}${d.delta} points. This is a timing overlap, not proof of cause.`,
        evidence: [
          `Product: ${product.name}${product.brand ? ` (${product.brand})` : ""}`,
          `Started: ${product.dateStarted}`,
          `${d.label}: ${d.before} → ${d.after} (${d.delta > 0 ? "+" : ""}${d.delta})`,
        ],
        confidence: baseConfidence === "high" ? "medium" : "low",
      });
    }
  }

  return out;
}

function buildVerdict(overallDelta: number, deltas: MetricDelta[], daysBetween: number): string {
  const improved = deltas.filter((d) => d.direction === "improved");
  const declined = deltas.filter((d) => d.direction === "declined");

  if (!deltas.length) {
    return "These two scans measured different dimensions, so there is nothing directly comparable between them.";
  }
  if (!improved.length && !declined.length) {
    return `Across ${daysBetween} days every measured dimension held steady within measurement noise (±${MEANINGFUL_DELTA} points).`;
  }
  const parts: string[] = [];
  if (improved.length) {
    parts.push(`${improved.map((d) => d.label.toLowerCase()).join(", ")} improved`);
  }
  if (declined.length) {
    parts.push(`${declined.map((d) => d.label.toLowerCase()).join(", ")} declined`);
  }
  const direction = overallDelta > 0 ? "up" : overallDelta < 0 ? "down" : "flat";
  return `Over ${daysBetween} days your SkinTwin score is ${direction}${
    overallDelta !== 0 ? ` ${Math.abs(overallDelta)} points` : ""
  } — ${parts.join(", while ")}.`;
}

export type BuildProgressInput = {
  before: SkinScan;
  after: SkinScan;
  habits?: DailyHabit[];
  products?: Product[];
};

/**
 * Compares two scans and explains the change using what the user logged between them.
 *
 * Deliberately conservative: it compares only dimensions both scans measured, treats small moves
 * as noise, and frames every habit/product link as an overlap rather than a cause.
 */
export function buildProgressReport({
  before,
  after,
  habits = [],
  products = [],
}: BuildProgressInput): ProgressReport {
  const daysBetween = Math.max(0, dayNumber(after.scanDate) - dayNumber(before.scanDate));
  const keys = comparableKeys(before, after);

  const metricDeltas: MetricDelta[] = keys.map((key) => {
    const b = before.metrics[key];
    const a = after.metrics[key];
    const delta = Math.round(a - b);
    return { key, label: metricLabel(key), before: b, after: a, delta, direction: directionOf(delta) };
  });

  const comparable = new Set(keys);
  const notComparable = (Object.keys(after.metrics) as (keyof SkinMetrics)[])
    .filter((k) => !comparable.has(k))
    .map((k) => ({ key: k, label: metricLabel(k) }));

  const adherence = summarizeAdherence(habits, before.scanDate, after.scanDate);

  const windowStart = dayNumber(before.scanDate);
  const windowEnd = dayNumber(after.scanDate);
  const productsStarted = products.filter((p) => {
    const started = dayNumber(p.dateStarted);
    return started >= windowStart && started <= windowEnd;
  });
  const productsRunning = products.filter((p) => {
    const started = dayNumber(p.dateStarted);
    const stopped = p.dateStopped ? dayNumber(p.dateStopped) : Infinity;
    return started < windowStart && stopped >= windowEnd;
  });
  const productsStopped = products.filter((p) => {
    if (!p.dateStopped) return false;
    const stopped = dayNumber(p.dateStopped);
    return stopped >= windowStart && stopped <= windowEnd;
  });

  return {
    before,
    after,
    daysBetween,
    overallDelta: Math.round(after.overallScore - before.overallScore),
    metricDeltas: [...metricDeltas].sort((x, y) => y.delta - x.delta),
    notComparable,
    adherence,
    productsStarted,
    productsRunning,
    productsStopped,
    attributions: buildAttributions(metricDeltas, adherence, productsStarted, productsRunning, daysBetween),
    verdict: buildVerdict(
      Math.round(after.overallScore - before.overallScore),
      metricDeltas,
      daysBetween
    ),
  };
}
