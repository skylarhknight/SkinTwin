"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DataModeBadge } from "@/components/DataModeBadge";
import { EmptyState } from "@/components/EmptyState";
import { PoweredByPerfect } from "@/components/PoweredByPerfect";
import { getAccessToken } from "@/lib/auth/authClient";
import {
  buildShopUrl,
  categoryGradient,
  categoryIcon,
  type CatalogCategory,
  type CatalogProduct,
} from "@/lib/recommendations/productCatalog";
import { recommendProducts, type ProductRecommendation } from "@/lib/recommendations/recommend";
import { LS_KEYS } from "@/lib/storage/localStorageKeys";
import type { Product, SkinScan, UserProfile } from "@/lib/types";

const CATEGORY_FILTERS: { id: CatalogCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cleanser", label: "Cleanser" },
  { id: "serum", label: "Serum" },
  { id: "moisturizer", label: "Moisturizer" },
  { id: "sunscreen", label: "SPF" },
  { id: "treatment", label: "Treatment" },
  { id: "exfoliant", label: "Exfoliant" },
  { id: "eye-care", label: "Eye care" },
  { id: "mask", label: "Mask" },
];

function bandFor(matchScore: number): { label: string; cls: string } {
  if (matchScore >= 75) return { label: "Strong match", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
  if (matchScore >= 55) return { label: "Good match", cls: "bg-sky-50 text-sky-700 ring-sky-200" };
  return { label: "Maybe", cls: "bg-slate-50 text-slate-600 ring-slate-200" };
}

export default function RecommendationsPage() {
  const [scan, setScan] = useState<SkinScan | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [shelf, setShelf] = useState<Product[]>([]);
  const [category, setCategory] = useState<CatalogCategory | "all">("all");
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    const sRaw = localStorage.getItem(LS_KEYS.latestScan);
    if (sRaw) {
      try {
        setScan(JSON.parse(sRaw) as SkinScan);
      } catch {
        /* ignore */
      }
    }
    const pRaw = localStorage.getItem(LS_KEYS.profile);
    if (pRaw) {
      try {
        setProfile(JSON.parse(pRaw) as UserProfile);
      } catch {
        /* ignore */
      }
    }
    getAccessToken()
      .then((token) => {
        if (!token) throw new Error("missing token");
        return fetch("/api/products", { headers: { Authorization: `Bearer ${token}` } });
      })
      .then((r) => r.json())
      .then((data) => {
        const next = (data as { products?: Product[] }).products ?? [];
        setShelf(next);
      })
      .catch(() => undefined);
  }, []);

  const recs: ProductRecommendation[] = useMemo(
    () =>
      recommendProducts(
        { scan, tone: scan?.facialToneData ?? null, profile },
        { categoryFilter: category, limit: 18 }
      ),
    [scan, profile, category]
  );

  const onShelf = useMemo(() => {
    const set = new Set<string>();
    shelf.forEach((p) => {
      const key = `${(p.brand ?? "").toLowerCase()}|${p.name.toLowerCase()}`;
      set.add(key);
    });
    return set;
  }, [shelf]);

  const isOnShelf = (p: CatalogProduct) =>
    onShelf.has(`${p.brand.toLowerCase()}|${p.name.toLowerCase()}`);

  const addToShelf = async (product: CatalogProduct) => {
    setAdding(product.id);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const payload: Product = {
        id: `product-${Date.now()}`,
        name: product.name,
        brand: product.brand,
        category: product.category,
        activeIngredients: product.highlights,
        usageTime: product.category === "sunscreen" ? "AM" : "Both",
        frequency: "daily",
        dateStarted: new Date().toISOString().slice(0, 10),
      };
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      const created = (data as { product?: Product }).product ?? payload;
      const next = [...shelf, created];
      setShelf(next);
      localStorage.setItem(LS_KEYS.products, JSON.stringify(next));
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge">Shopping</span>
            <PoweredByPerfect apis={scan?.facialToneData ? ["skin-analysis", "facial-tone"] : "skin-analysis"} />
          </div>
          <h1 className="mt-3 text-3xl font-semibold">Personalized for You</h1>
          <p className="mt-2 max-w-2xl text-sm text-sf-muted">
            Ranked from a curated catalog using your latest scan&apos;s top concerns
            {scan?.facialToneData ? `, your ${scan.facialToneData.undertone} undertone,` : ""} and your skin profile. Each
            card explains <span className="font-medium text-sf-ink">why it matches you</span>.
          </p>
        </div>
        <DataModeBadge />
      </div>

      {!scan ? (
        <EmptyState
          title="Scan first to unlock personalized picks"
          body="Recommendations rank against your scan's lowest scoring areas. Take a 30-second scan to see what's actually relevant to your skin today."
          cta="Take a Scan"
          href="/scan"
        />
      ) : (
        <>
          <section className="card">
            <div className="flex flex-wrap items-center gap-2">
              {CATEGORY_FILTERS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={
                    c.id === category
                      ? "rounded-full bg-sf-blue px-4 py-1.5 text-xs font-semibold text-white shadow-sf-sm"
                      : "rounded-full border border-[#dbe4f4] bg-white px-4 py-1.5 text-xs font-medium text-sf-ink shadow-sm hover:bg-sf-blue-soft"
                  }
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-sf-muted">
              {scan?.topConcerns?.length ? (
                <>
                  Ranking against{" "}
                  {scan.topConcerns.slice(0, 3).map((c, i) => (
                    <span key={c}>
                      <span className="font-medium text-sf-ink">{c}</span>
                      {i < Math.min(2, scan.topConcerns.length - 1) ? ", " : ""}
                    </span>
                  ))}
                  {scan.topConcerns.length > 1 ? "." : ""}
                </>
              ) : (
                <>Showing strong general picks.</>
              )}
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recs.map((r) => {
              const band = bandFor(r.matchScore);
              const onShelfNow = isOnShelf(r.product);
              return (
                <article key={r.product.id} className="card flex flex-col gap-3">
                  <div
                    className={`relative flex h-36 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${categoryGradient(
                      r.product.category
                    )}`}
                  >
                    <span className="text-5xl" aria-hidden>
                      {categoryIcon(r.product.category)}
                    </span>
                    <span
                      className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${band.cls}`}
                    >
                      {r.matchScore} · {band.label}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-sf-muted">
                      {r.product.brand}
                    </p>
                    <h3 className="text-sm font-semibold leading-snug text-sf-ink">
                      {r.product.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-sf-muted capitalize">
                      {r.product.category.replace("-", " ")} · ${r.product.priceUsd}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-sf-blue-lighter/60 bg-sf-blue-pale/60 p-3">
                    <p className="text-xs font-semibold text-sf-blue-deep">{r.headline}</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-5 text-sf-muted">
                      {r.reasons.slice(0, 3).map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {r.product.highlights.slice(0, 3).map((h) => (
                      <span
                        key={h}
                        className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-sf-ink ring-1 ring-[#dbe4f4]"
                      >
                        {h}
                      </span>
                    ))}
                  </div>

                  {r.warnings.length ? (
                    <p className="rounded-2xl bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800 ring-1 ring-amber-200">
                      {r.warnings.join(" ")}
                    </p>
                  ) : null}

                  <div className="mt-auto flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => addToShelf(r.product)}
                      disabled={onShelfNow || adding === r.product.id}
                      className={
                        onShelfNow
                          ? "flex-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                          : "flex-1 rounded-full bg-sf-blue px-3 py-2 text-xs font-semibold text-white shadow-sf-sm hover:bg-sf-blue-deep disabled:opacity-60"
                      }
                    >
                      {onShelfNow ? "On your shelf" : adding === r.product.id ? "Adding…" : "Add to shelf"}
                    </button>
                    <a
                      href={buildShopUrl(r.product)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-[#dbe4f4] bg-white px-3 py-2 text-xs font-semibold text-sf-ink shadow-sm hover:bg-sf-blue-soft"
                    >
                      Shop ↗
                    </a>
                  </div>
                </article>
              );
            })}
          </section>

          <p className="text-center text-[11px] text-sf-muted">
            Catalog is illustrative and not affiliated with the brands listed. Always patch test new products and consult a
            licensed dermatologist for medical concerns.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link className="btn-secondary" href="/products">
              View My Shelf
            </Link>
            <Link className="btn-primary" href="/routine">
              Update Routine
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
