import type { SkinMetrics } from "@/lib/types";

export type CatalogCategory =
  | "cleanser"
  | "serum"
  | "moisturizer"
  | "sunscreen"
  | "treatment"
  | "exfoliant"
  | "eye-care"
  | "mask";

export type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  category: CatalogCategory;
  priceUsd: number;
  /** Which skin metric keys this product is designed to improve (lower scores = higher need). */
  targets: (keyof SkinMetrics)[];
  /** Notable active ingredients used for the "Why this matches" rationale. */
  highlights: string[];
  /** Suitable skin types ("all" if universal). */
  skinTypes: ("dry" | "oily" | "combination" | "normal" | "sensitive" | "all")[];
  /** Undertones this product compliments ("all" if universal). */
  undertoneFit: ("warm" | "cool" | "neutral" | "olive" | "all")[];
  /** Sensitivity boundary: high = avoid for sensitive skin. */
  sensitivityRisk: "low" | "medium" | "high";
  description: string;
  /** Build a search-style shop URL the user can click. */
  shopProvider: "sephora" | "amazon" | "ulta";
};

export const PRODUCT_CATALOG: CatalogProduct[] = [
  {
    id: "cera-foaming-cleanser",
    name: "Foaming Facial Cleanser",
    brand: "CeraVe",
    category: "cleanser",
    priceUsd: 17,
    targets: ["oiliness", "pores", "acne"],
    highlights: ["ceramides", "niacinamide", "hyaluronic acid"],
    skinTypes: ["oily", "combination", "normal"],
    undertoneFit: ["all"],
    sensitivityRisk: "low",
    description: "Gentle daily foaming cleanser that removes excess oil without stripping the barrier.",
    shopProvider: "amazon",
  },
  {
    id: "cera-hydrating-cleanser",
    name: "Hydrating Facial Cleanser",
    brand: "CeraVe",
    category: "cleanser",
    priceUsd: 17,
    targets: ["hydration", "redness"],
    highlights: ["ceramides", "hyaluronic acid"],
    skinTypes: ["dry", "normal", "sensitive"],
    undertoneFit: ["all"],
    sensitivityRisk: "low",
    description: "Non-foaming, lipid-friendly cleanser for dry or compromised barriers.",
    shopProvider: "amazon",
  },
  {
    id: "la-roche-toleriane-cleanser",
    name: "Toleriane Hydrating Gentle Cleanser",
    brand: "La Roche-Posay",
    category: "cleanser",
    priceUsd: 16,
    targets: ["redness", "hydration"],
    highlights: ["niacinamide", "glycerin"],
    skinTypes: ["sensitive", "dry", "normal"],
    undertoneFit: ["all"],
    sensitivityRisk: "low",
    description: "Calming cleanser formulated for reactive skin and post-procedure care.",
    shopProvider: "ulta",
  },
  {
    id: "ordinary-niacinamide",
    name: "Niacinamide 10% + Zinc 1%",
    brand: "The Ordinary",
    category: "serum",
    priceUsd: 8,
    targets: ["oiliness", "pores", "redness"],
    highlights: ["niacinamide 10%", "zinc PCA"],
    skinTypes: ["oily", "combination", "normal"],
    undertoneFit: ["all"],
    sensitivityRisk: "low",
    description: "Affordable oil-control and pore-refining serum with anti-redness backing.",
    shopProvider: "sephora",
  },
  {
    id: "ordinary-haserum",
    name: "Hyaluronic Acid 2% + B5",
    brand: "The Ordinary",
    category: "serum",
    priceUsd: 9,
    targets: ["hydration", "radiance"],
    highlights: ["hyaluronic acid", "vitamin B5"],
    skinTypes: ["all"],
    undertoneFit: ["all"],
    sensitivityRisk: "low",
    description: "Multi-weight HA serum that plumps surface hydration immediately.",
    shopProvider: "sephora",
  },
  {
    id: "skinceuticals-ce-ferulic",
    name: "C E Ferulic",
    brand: "SkinCeuticals",
    category: "serum",
    priceUsd: 182,
    targets: ["pigmentation", "radiance", "wrinkles"],
    highlights: ["15% L-ascorbic acid", "vitamin E", "ferulic acid"],
    skinTypes: ["normal", "combination", "dry"],
    undertoneFit: ["all"],
    sensitivityRisk: "medium",
    description: "Gold-standard antioxidant serum for tone, brightness, and photoaging defense.",
    shopProvider: "sephora",
  },
  {
    id: "good-molecules-vitamin-c",
    name: "Discoloration Correcting Serum",
    brand: "Good Molecules",
    category: "serum",
    priceUsd: 12,
    targets: ["pigmentation", "radiance"],
    highlights: ["tranexamic acid", "niacinamide"],
    skinTypes: ["all"],
    undertoneFit: ["warm", "olive", "neutral"],
    sensitivityRisk: "low",
    description: "Affordable, gentle alternative to vitamin C for fading dark spots.",
    shopProvider: "sephora",
  },
  {
    id: "paulas-bha",
    name: "Skin Perfecting 2% BHA Liquid",
    brand: "Paula's Choice",
    category: "exfoliant",
    priceUsd: 35,
    targets: ["pores", "texture", "acne"],
    highlights: ["salicylic acid 2%"],
    skinTypes: ["oily", "combination", "normal"],
    undertoneFit: ["all"],
    sensitivityRisk: "medium",
    description: "Cult-favorite chemical exfoliant for clogged pores and uneven texture.",
    shopProvider: "sephora",
  },
  {
    id: "the-inkey-list-pha",
    name: "PHA Toner",
    brand: "The Inkey List",
    category: "exfoliant",
    priceUsd: 12,
    targets: ["texture", "radiance"],
    highlights: ["gluconolactone (PHA)"],
    skinTypes: ["sensitive", "dry", "normal"],
    undertoneFit: ["all"],
    sensitivityRisk: "low",
    description: "Gentlest exfoliating acid family — PHAs improve texture without irritation.",
    shopProvider: "sephora",
  },
  {
    id: "neutrogena-hydroboost",
    name: "Hydro Boost Water Gel",
    brand: "Neutrogena",
    category: "moisturizer",
    priceUsd: 22,
    targets: ["hydration", "oiliness"],
    highlights: ["hyaluronic acid"],
    skinTypes: ["oily", "combination", "normal"],
    undertoneFit: ["all"],
    sensitivityRisk: "low",
    description: "Lightweight gel hydration for skins that don't want a heavy cream.",
    shopProvider: "amazon",
  },
  {
    id: "cera-moisturizing-cream",
    name: "Moisturizing Cream",
    brand: "CeraVe",
    category: "moisturizer",
    priceUsd: 19,
    targets: ["hydration", "redness"],
    highlights: ["ceramides", "hyaluronic acid"],
    skinTypes: ["dry", "sensitive", "normal"],
    undertoneFit: ["all"],
    sensitivityRisk: "low",
    description: "Rich barrier-repair cream for dry skin or compromised barriers.",
    shopProvider: "amazon",
  },
  {
    id: "first-aid-beauty-ultra-repair",
    name: "Ultra Repair Cream",
    brand: "First Aid Beauty",
    category: "moisturizer",
    priceUsd: 38,
    targets: ["hydration", "redness", "texture"],
    highlights: ["colloidal oatmeal", "shea butter"],
    skinTypes: ["sensitive", "dry"],
    undertoneFit: ["all"],
    sensitivityRisk: "low",
    description: "Soothing emollient cream for reactive skin and weather-stressed barriers.",
    shopProvider: "sephora",
  },
  {
    id: "supergoop-unseen",
    name: "Unseen Sunscreen SPF 40",
    brand: "Supergoop!",
    category: "sunscreen",
    priceUsd: 38,
    targets: ["pigmentation", "wrinkles", "radiance"],
    highlights: ["broad spectrum SPF 40", "antioxidants"],
    skinTypes: ["all"],
    undertoneFit: ["all"],
    sensitivityRisk: "low",
    description: "Invisible, weightless SPF that doubles as a smoothing primer.",
    shopProvider: "sephora",
  },
  {
    id: "la-roche-anthelios",
    name: "Anthelios Mineral SPF 50",
    brand: "La Roche-Posay",
    category: "sunscreen",
    priceUsd: 35,
    targets: ["pigmentation", "redness", "wrinkles"],
    highlights: ["zinc oxide", "titanium dioxide"],
    skinTypes: ["sensitive", "dry", "normal"],
    undertoneFit: ["all"],
    sensitivityRisk: "low",
    description: "Mineral SPF 50 designed for reactive and post-procedure skin.",
    shopProvider: "ulta",
  },
  {
    id: "eltamd-uv-clear",
    name: "UV Clear Broad-Spectrum SPF 46",
    brand: "EltaMD",
    category: "sunscreen",
    priceUsd: 41,
    targets: ["redness", "acne", "pigmentation"],
    highlights: ["zinc oxide", "niacinamide"],
    skinTypes: ["sensitive", "oily", "combination"],
    undertoneFit: ["all"],
    sensitivityRisk: "low",
    description: "Acne- and rosacea-friendly SPF; the dermatologist's go-to.",
    shopProvider: "amazon",
  },
  {
    id: "differin-gel",
    name: "Adapalene Gel 0.1%",
    brand: "Differin",
    category: "treatment",
    priceUsd: 15,
    targets: ["acne", "texture", "pores"],
    highlights: ["adapalene 0.1% (retinoid)"],
    skinTypes: ["oily", "combination", "normal"],
    undertoneFit: ["all"],
    sensitivityRisk: "high",
    description: "OTC retinoid that resets cell turnover for acne and texture.",
    shopProvider: "amazon",
  },
  {
    id: "ordinary-retinal",
    name: "Retinal 0.2% Emulsion",
    brand: "The Ordinary",
    category: "treatment",
    priceUsd: 16,
    targets: ["wrinkles", "texture", "radiance"],
    highlights: ["retinaldehyde"],
    skinTypes: ["normal", "combination", "oily"],
    undertoneFit: ["all"],
    sensitivityRisk: "high",
    description: "Stronger-than-retinol but gentler-than-tretinoin, for fine lines + tone.",
    shopProvider: "sephora",
  },
  {
    id: "biossance-squalane-vit-c",
    name: "Squalane + Vitamin C Rose Oil",
    brand: "Biossance",
    category: "treatment",
    priceUsd: 78,
    targets: ["radiance", "pigmentation", "hydration"],
    highlights: ["squalane", "vitamin C"],
    skinTypes: ["dry", "normal", "combination"],
    undertoneFit: ["warm", "neutral", "cool"],
    sensitivityRisk: "medium",
    description: "Glow-boosting facial oil for dull skin in dry climates.",
    shopProvider: "sephora",
  },
  {
    id: "kiehls-eye-alpha-h",
    name: "Avocado Eye Cream",
    brand: "Kiehl's",
    category: "eye-care",
    priceUsd: 35,
    targets: ["darkCircles", "hydration"],
    highlights: ["avocado oil", "shea butter"],
    skinTypes: ["all"],
    undertoneFit: ["all"],
    sensitivityRisk: "low",
    description: "Rich, nourishing eye cream for under-eye dryness and tired-looking eyes.",
    shopProvider: "sephora",
  },
  {
    id: "olehenriksen-banana-eye",
    name: "Banana Bright+ Eye Crème",
    brand: "Ole Henriksen",
    category: "eye-care",
    priceUsd: 39,
    targets: ["darkCircles", "radiance"],
    highlights: ["vitamin C", "peptides"],
    skinTypes: ["all"],
    undertoneFit: ["warm", "olive", "neutral"],
    sensitivityRisk: "low",
    description: "Brightening eye cream that visibly preps under-eyes for makeup.",
    shopProvider: "sephora",
  },
  {
    id: "drunk-elephant-cocomino",
    name: "C-Tango Multivitamin Eye Cream",
    brand: "Drunk Elephant",
    category: "eye-care",
    priceUsd: 64,
    targets: ["darkCircles", "wrinkles"],
    highlights: ["8 peptides", "vitamin C"],
    skinTypes: ["normal", "combination", "dry"],
    undertoneFit: ["all"],
    sensitivityRisk: "medium",
    description: "Firming eye cream targeting fine lines and dullness around the eye.",
    shopProvider: "sephora",
  },
  {
    id: "summer-fridays-jet-lag",
    name: "Jet Lag Mask",
    brand: "Summer Fridays",
    category: "mask",
    priceUsd: 49,
    targets: ["hydration", "radiance"],
    highlights: ["niacinamide", "glycerin", "vitamin B5"],
    skinTypes: ["all"],
    undertoneFit: ["all"],
    sensitivityRisk: "low",
    description: "Wear-overnight hydration mask for travel-stressed or dehydrated skin.",
    shopProvider: "sephora",
  },
  {
    id: "kiehls-rare-earth-mask",
    name: "Rare Earth Deep Pore Cleansing Masque",
    brand: "Kiehl's",
    category: "mask",
    priceUsd: 35,
    targets: ["pores", "oiliness"],
    highlights: ["amazonian white clay"],
    skinTypes: ["oily", "combination"],
    undertoneFit: ["all"],
    sensitivityRisk: "medium",
    description: "Detoxifying clay mask for visibly congested pores.",
    shopProvider: "sephora",
  },
  {
    id: "tatcha-rice-polish",
    name: "Rice Wash Soft Cream Cleanser",
    brand: "Tatcha",
    category: "cleanser",
    priceUsd: 36,
    targets: ["radiance", "texture"],
    highlights: ["rice extract", "hyaluronic acid"],
    skinTypes: ["all"],
    undertoneFit: ["all"],
    sensitivityRisk: "low",
    description: "Creamy, rinse-off cleanser that leaves skin soft and glowing.",
    shopProvider: "sephora",
  },
  {
    id: "youth-to-the-people-superfood",
    name: "Superfood Antioxidant Cleanser",
    brand: "Youth To The People",
    category: "cleanser",
    priceUsd: 38,
    targets: ["radiance", "redness"],
    highlights: ["kale", "spinach", "green tea"],
    skinTypes: ["all"],
    undertoneFit: ["all"],
    sensitivityRisk: "low",
    description: "Antioxidant-rich gel cleanser that's still gentle on the barrier.",
    shopProvider: "sephora",
  },
  {
    id: "krave-great-barrier-relief",
    name: "Great Barrier Relief",
    brand: "Krave Beauty",
    category: "treatment",
    priceUsd: 28,
    targets: ["redness", "hydration", "texture"],
    highlights: ["tamanu oil", "niacinamide"],
    skinTypes: ["sensitive", "combination", "normal"],
    undertoneFit: ["all"],
    sensitivityRisk: "low",
    description: "Barrier-repair serum that resets compromised, reactive skin in days.",
    shopProvider: "sephora",
  },
];

const SHOP_URL: Record<CatalogProduct["shopProvider"], (q: string) => string> = {
  sephora: (q) => `https://www.sephora.com/search?keyword=${encodeURIComponent(q)}`,
  amazon: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
  ulta: (q) => `https://www.ulta.com/shop/search?Ntt=${encodeURIComponent(q)}`,
};

export function buildShopUrl(product: CatalogProduct): string {
  return SHOP_URL[product.shopProvider](`${product.brand} ${product.name}`);
}

const CATEGORY_GRADIENT: Record<CatalogCategory, string> = {
  cleanser: "from-sky-100 to-sky-50",
  serum: "from-rose-100 to-rose-50",
  moisturizer: "from-amber-100 to-amber-50",
  sunscreen: "from-yellow-100 to-yellow-50",
  treatment: "from-violet-100 to-violet-50",
  exfoliant: "from-pink-100 to-pink-50",
  "eye-care": "from-indigo-100 to-indigo-50",
  mask: "from-emerald-100 to-emerald-50",
};

const CATEGORY_ICON: Record<CatalogCategory, string> = {
  cleanser: "🧼",
  serum: "💧",
  moisturizer: "🪻",
  sunscreen: "☀️",
  treatment: "🧪",
  exfoliant: "✨",
  "eye-care": "👁️",
  mask: "🌿",
};

export function categoryGradient(category: CatalogCategory): string {
  return CATEGORY_GRADIENT[category] ?? "from-slate-100 to-slate-50";
}

export function categoryIcon(category: CatalogCategory): string {
  return CATEGORY_ICON[category] ?? "🧴";
}

/**
 * Product photography lives in /public/products. Shot images cover a subset of the
 * catalog exactly; everything else falls back to the category-representative shot so
 * a card never renders an empty frame.
 */
const PRODUCT_IMAGE: Record<string, string> = {
  "cera-hydrating-cleanser": "/products/facial-cleanser.webp",
  "ordinary-niacinamide": "/products/niacinamide.webp",
  "neutrogena-hydroboost": "/products/hydro-water-gel.webp",
  "biossance-squalane-vit-c": "/products/rose-oil.webp",
  "kiehls-eye-alpha-h": "/products/avocado-eye-cream.webp",
  "kiehls-rare-earth-mask": "/products/earth-masque.webp",
  "la-roche-anthelios": "/products/mineral-spf-50.webp",
};

const CATEGORY_IMAGE: Record<CatalogCategory, string> = {
  cleanser: "/products/facial-cleanser.webp",
  serum: "/products/peptide-firming-serum.webp",
  moisturizer: "/products/barrier-repair-cream.webp",
  sunscreen: "/products/mineral-spf-50.webp",
  treatment: "/products/rose-oil.webp",
  exfoliant: "/products/milky-hydration-toner.webp",
  "eye-care": "/products/avocado-eye-cream.webp",
  mask: "/products/overnight-recovery-mask.webp",
};

export function productImage(product: Pick<CatalogProduct, "id" | "category">): string {
  return PRODUCT_IMAGE[product.id] ?? CATEGORY_IMAGE[product.category] ?? "/products/barrier-repair-cream.webp";
}

/**
 * Shelf items are user-entered, so they carry a free-text category rather than a
 * CatalogCategory. Match on the catalog first (exact name), then normalise the
 * category string onto a known bucket.
 */
export function shelfImage(name: string, category: string): string {
  const lowerName = name.trim().toLowerCase();
  const match = PRODUCT_CATALOG.find((p) => p.name.toLowerCase() === lowerName);
  if (match) return productImage(match);

  const c = category.toLowerCase();
  if (c.includes("cleanser") || c.includes("wash")) return CATEGORY_IMAGE.cleanser;
  if (c.includes("sunscreen") || c.includes("spf") || c.includes("sun")) return CATEGORY_IMAGE.sunscreen;
  if (c.includes("moistur") || c.includes("cream") || c.includes("lotion")) return CATEGORY_IMAGE.moisturizer;
  if (c.includes("eye")) return CATEGORY_IMAGE["eye-care"];
  if (c.includes("mask") || c.includes("masque")) return CATEGORY_IMAGE.mask;
  if (c.includes("exfoli") || c.includes("toner") || c.includes("acid")) return CATEGORY_IMAGE.exfoliant;
  if (c.includes("treatment") || c.includes("retin") || c.includes("oil")) return CATEGORY_IMAGE.treatment;
  return CATEGORY_IMAGE.serum;
}
