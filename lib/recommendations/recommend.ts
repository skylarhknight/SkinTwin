import type { FacialToneData, SkinMetrics, SkinScan, UserProfile } from "@/lib/types";
import {
  PRODUCT_CATALOG,
  type CatalogCategory,
  type CatalogProduct,
} from "./productCatalog";

export type RecommendationInput = {
  scan?: SkinScan | null;
  tone?: FacialToneData | null;
  profile?: UserProfile | null;
};

export type ProductRecommendation = {
  product: CatalogProduct;
  /** 0–100 match score for sorting and UI display. */
  matchScore: number;
  /** Short rationale strings shown as bullets on the card. */
  reasons: string[];
  /** A primary "Why this matches you" headline (one sentence). */
  headline: string;
  /** Hard-block warnings (e.g., "Contains a high-risk active for sensitive skin"). */
  warnings: string[];
};

const METRIC_LABELS: Record<keyof SkinMetrics, string> = {
  hydration: "hydration",
  redness: "redness",
  acne: "clarity",
  pores: "pores",
  texture: "texture",
  wrinkles: "fine lines",
  darkCircles: "dark circles",
  pigmentation: "pigmentation",
  radiance: "radiance",
  oiliness: "oil balance",
};

/** Lower scores = bigger need — return concerns sorted by deficit (most urgent first). */
function rankConcerns(metrics: SkinMetrics, analyzedKeys?: (keyof SkinMetrics)[]): (keyof SkinMetrics)[] {
  const keys = (analyzedKeys?.length ? analyzedKeys : (Object.keys(metrics) as (keyof SkinMetrics)[]));
  return [...keys]
    .filter((k) => typeof metrics[k] === "number")
    .sort((a, b) => metrics[a] - metrics[b]);
}

function profileSkinTypeMatches(product: CatalogProduct, profile?: UserProfile | null): boolean {
  if (!profile) return true;
  if (product.skinTypes.includes("all")) return true;
  if (profile.sensitivityLevel === "high" && product.skinTypes.includes("sensitive")) return true;
  return product.skinTypes.includes(profile.skinType as never);
}

function toneMatches(product: CatalogProduct, tone?: FacialToneData | null): boolean {
  if (!tone) return true;
  if (product.undertoneFit.includes("all")) return true;
  return product.undertoneFit.includes(tone.undertone as never);
}

function sensitivityWarnings(product: CatalogProduct, profile?: UserProfile | null): string[] {
  const out: string[] = [];
  if (!profile) return out;
  if (profile.sensitivityLevel === "high" && product.sensitivityRisk === "high") {
    out.push("Contains a strong active — patch test before daily use on sensitive skin.");
  }
  return out;
}

export function recommendProducts(
  input: RecommendationInput,
  options: { limit?: number; categoryFilter?: CatalogCategory | "all" } = {}
): ProductRecommendation[] {
  const limit = options.limit ?? 12;
  const categoryFilter = options.categoryFilter ?? "all";
  const scan = input.scan ?? null;
  const tone = input.tone ?? scan?.facialToneData ?? null;
  const profile = input.profile ?? null;

  const concerns = scan ? rankConcerns(scan.metrics, scan.analyzedMetricKeys) : [];
  const concernRank = new Map<keyof SkinMetrics, number>();
  concerns.forEach((c, idx) => concernRank.set(c, idx));

  const goalMetricMap: Record<string, (keyof SkinMetrics)[]> = {
    reduce_acne: ["acne", "pores"],
    improve_hydration: ["hydration"],
    reduce_redness: ["redness"],
    fade_dark_spots: ["pigmentation"],
    improve_texture: ["texture", "pores"],
    prevent_aging: ["wrinkles", "pigmentation"],
    reduce_dark_circles: ["darkCircles"],
    build_consistency: [],
  };
  const goalMetrics = new Set<keyof SkinMetrics>();
  (profile?.primaryGoals ?? []).forEach((g) => (goalMetricMap[g] ?? []).forEach((m) => goalMetrics.add(m)));

  const ranked = PRODUCT_CATALOG.filter((p) =>
    categoryFilter === "all" ? true : p.category === categoryFilter
  ).map<ProductRecommendation>((product) => {
    let score = 35;
    const reasons: string[] = [];

    /** Concern alignment — biggest signal. */
    let topMatchedConcern: keyof SkinMetrics | undefined;
    let bestRank = Infinity;
    for (const target of product.targets) {
      const rank = concernRank.get(target);
      if (rank === undefined) continue;
      if (rank < bestRank) {
        bestRank = rank;
        topMatchedConcern = target;
      }
      if (rank === 0) score += 30;
      else if (rank === 1) score += 22;
      else if (rank === 2) score += 14;
      else score += 6;
    }
    if (topMatchedConcern && scan) {
      const value = scan.metrics[topMatchedConcern];
      reasons.push(
        `Targets your ${METRIC_LABELS[topMatchedConcern]} score (${value}/100 — one of your lower areas).`
      );
    }

    /** Goal alignment from onboarding. */
    if (goalMetrics.size) {
      const goalHit = product.targets.find((t) => goalMetrics.has(t));
      if (goalHit) {
        score += 8;
        reasons.push(`Aligns with your selected goal (${METRIC_LABELS[goalHit]}).`);
      }
    }

    /** Skin type match. */
    if (profileSkinTypeMatches(product, profile)) {
      score += 5;
      if (profile && !product.skinTypes.includes("all")) {
        reasons.push(`Formulated for ${profile.skinType} skin.`);
      }
    } else {
      score -= 14;
    }

    /** Tone match (mostly relevant for brightening/tone products). */
    if (tone && toneMatches(product, tone) && !product.undertoneFit.includes("all")) {
      score += 4;
      reasons.push(`Compliments a ${tone.undertone} undertone.`);
    }

    /** Sensitivity guardrails. */
    const warnings = sensitivityWarnings(product, profile);
    if (profile?.sensitivityLevel === "high" && product.sensitivityRisk === "high") score -= 25;
    if (profile?.sensitivityLevel === "low" && product.sensitivityRisk === "high") score += 2;

    /** Budget hint. */
    if (profile?.budgetLevel === "$" && product.priceUsd > 35) score -= 8;
    if (profile?.budgetLevel === "$$$" && product.priceUsd > 60) score += 3;

    /** SPF priority bump — if missing pigmentation and no scan: still recommend SPF. */
    if (product.category === "sunscreen") {
      score += 6;
      if (!reasons.some((r) => r.toLowerCase().includes("spf"))) {
        reasons.push("Daily SPF is the single biggest lever for tone and aging.");
      }
    }

    /** Always carry a fallback reason. */
    if (!reasons.length) {
      reasons.push(
        `Strong general pick: ${product.highlights.slice(0, 2).join(", ")}.`
      );
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    const headline =
      topMatchedConcern && scan
        ? `Best match for your ${METRIC_LABELS[topMatchedConcern]}.`
        : product.category === "sunscreen"
        ? "Daily SPF — the biggest long-term lever."
        : `Solid foundational pick for ${product.category.replace("-", " ")}.`;

    return { product, matchScore: score, reasons, headline, warnings };
  });

  return ranked.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
}
