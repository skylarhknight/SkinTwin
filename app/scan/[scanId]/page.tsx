"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MetricRadar } from "@/components/charts/MetricRadar";
import { Disclaimer } from "@/components/Disclaimer";
import { EmptyState } from "@/components/EmptyState";
import { PoweredByPerfect } from "@/components/PoweredByPerfect";
import { SkinCardDownload } from "@/components/SkinCardDownload";
import { getCurrentUser } from "@/lib/auth/authClient";
import { LS_KEYS } from "@/lib/storage/localStorageKeys";
import type { SkinMetrics, SkinScan } from "@/lib/types";

const METRIC_LABELS: Record<keyof SkinMetrics, string> = {
  hydration: "Hydration",
  redness: "Redness",
  acne: "Clarity",
  pores: "Pores",
  texture: "Texture",
  wrinkles: "Fine lines",
  darkCircles: "Dark circles",
  pigmentation: "Tone",
  radiance: "Radiance",
  oiliness: "Oil balance",
};

const METRIC_HINTS: Record<keyof SkinMetrics, string> = {
  hydration: "Layer a humectant + occlusive PM.",
  redness: "Pause actives 48h, soothe with centella.",
  acne: "Keep BHA consistent, avoid pile-on.",
  pores: "Niacinamide + non-comedogenic basics.",
  texture: "Gentle exfoliation 2x/week.",
  wrinkles: "Daily SPF is the biggest lever.",
  darkCircles: "Sleep + caffeine eye care.",
  pigmentation: "SPF + vitamin C compound.",
  radiance: "Hydration + vitamin C combo.",
  oiliness: "Gel cleanser AM, balanced moisturizer PM.",
};

function bandColor(value: number): string {
  if (value >= 80) return "text-emerald-600";
  if (value >= 65) return "text-sf-blue-deep";
  if (value >= 50) return "text-amber-600";
  return "text-rose-600";
}

export default function ScanResultPage() {
  const router = useRouter();
  const [scan, setScan] = useState<SkinScan | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        if (!u) {
          router.replace("/login");
          return;
        }
        const raw = localStorage.getItem(LS_KEYS.latestScan);
        if (raw) setScan(JSON.parse(raw));
        setAuthChecked(true);
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  if (!authChecked) {
    return (
      <div className="space-y-6">
        <section className="card">
          <p className="text-sm text-sf-muted">Checking session...</p>
        </section>
      </div>
    );
  }

  if (!scan) {
    return (
      <EmptyState title="No scan found" body="Start with a selfie to generate your skin report." cta="Start Scan" href="/scan" />
    );
  }

  return (
    <div className="space-y-6">
      {scan.mockFallbackNote ? (
        <div className="rounded-2xl border border-sf-yellow/60 bg-sf-yellow-soft px-4 py-3 text-sm text-sf-ink ring-1 ring-sf-yellow/40">
          {scan.mockFallbackNote}
        </div>
      ) : null}

      {!scan.isMock &&
      scan.analyzedMetricKeys &&
      scan.analyzedMetricKeys.length > 0 &&
      scan.analyzedMetricKeys.length < 10 ? (
        <p className="rounded-2xl border border-sf-blue-lighter/80 bg-sf-blue-pale px-4 py-3 text-sm text-sf-ink">
          This run measured <span className="font-medium">{scan.analyzedMetricKeys.length}</span> dimension
          {scan.analyzedMetricKeys.length === 1 ? "" : "s"} from Perfect. Any metric still at{" "}
          <span className="font-medium">50</span> was not returned for this task—it is a neutral placeholder, not an
          estimate of your skin. Add more analysis types via{" "}
          <code className="rounded bg-sf-blue-soft px-1 text-xs font-medium">PERFECT_DST_ACTIONS</code> if your Perfect
          plan supports them.
        </p>
      ) : null}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge">{scan.isMock ? "Demo data" : "Live analysis"}</span>
            <PoweredByPerfect apis={scan.facialToneData ? ["skin-analysis", "facial-tone"] : "skin-analysis"} />
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-sf-ink">Today’s Skin Report</h1>
          <p className="mt-2 text-sf-muted">{scan.summary}</p>
        </div>
        <div className="card text-center shadow-sf">
          <p className="text-sm text-sf-muted">SkinTwin Score</p>
          <p className="text-6xl font-semibold text-sf-ink">{scan.overallScore}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <section className="card">
          <h2 className="font-semibold text-sf-ink">Skin profile</h2>
          <MetricRadar metrics={scan.metrics} />
          {scan.facialToneData ? (
            <div className="mt-4 rounded-2xl border border-sf-blue-lighter/70 bg-sf-blue-pale/50 p-4">
              <h3 className="text-sm font-semibold text-sf-ink">Facial tone</h3>
              <p className="mt-2 text-sm text-sf-muted">
                Undertone: <span className="font-medium capitalize text-sf-ink">{scan.facialToneData.undertone}</span>
              </p>
              <p className="mt-1 text-sm text-sf-muted">
                Pigmentation index: <span className="font-medium text-sf-ink">{scan.facialToneData.pigmentationIndex}</span>
              </p>
              <p className="mt-1 text-sm text-sf-muted">
                Redness index: <span className="font-medium text-sf-ink">{scan.facialToneData.rednessIndex}</span>
              </p>
            </div>
          ) : null}
        </section>
        <section className="card">
          <h2 className="font-semibold text-sf-ink">Top concerns</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {scan.topConcerns.map((c) => (
              <span className="badge" key={c}>
                {c}
              </span>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {Object.entries(scan.metrics).map(([k, v]) => {
              const key = k as keyof SkinMetrics;
              const value = Number(v);
              return (
                <div className="rounded-2xl border border-sf-blue-lighter/70 bg-sf-blue-pale/50 p-4" key={k}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-sf-muted">{METRIC_LABELS[key] ?? k}</p>
                    <p className={`text-2xl font-semibold ${bandColor(value)}`}>{value}</p>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/70">
                    <div
                      className="h-full bg-sf-blue-deep"
                      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                    />
                  </div>
                  {value < 75 ? (
                    <p className="mt-2 text-xs leading-5 text-sf-muted">{METRIC_HINTS[key]}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <Disclaimer />

      <div className="flex flex-wrap items-center gap-3">
        <Link className="btn-primary" href="/recommendations">
          Shop For Your Skin
        </Link>
        <Link className="btn-secondary" href="/routine">
          View Routine
        </Link>
        <Link className="btn-secondary" href="/dashboard">
          Dashboard
        </Link>
        <SkinCardDownload scan={scan} />
      </div>
    </div>
  );
}
