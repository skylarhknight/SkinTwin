"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DataModeBadge } from "@/components/DataModeBadge";
import { EmptyState } from "@/components/EmptyState";
import { PoweredByPerfect } from "@/components/PoweredByPerfect";
import { MetricRadar } from "@/components/charts/MetricRadar";
import { TrendLine } from "@/components/charts/TrendLine";
import { getAccessToken } from "@/lib/auth/authClient";
import type { SkinMetrics } from "@/lib/types";

const metrics = ["hydration", "redness", "pigmentation", "darkCircles", "texture", "radiance"] as (keyof SkinMetrics)[];
type Trends = {
  range: string;
  series: Record<string, { date: string; value: number }[]>;
  radar: { baseline: SkinMetrics; current: SkinMetrics } | null;
  callouts: string[];
};
export default function TrendsPage() {
  const [range, setRange] = useState("30d");
  const [metric, setMetric] = useState<keyof SkinMetrics>("hydration");
  const [data, setData] = useState<Trends | null>(null);
  useEffect(() => {
    getAccessToken()
      .then((token) => {
        if (!token) throw new Error("Please sign in again.");
        return fetch(`/api/trends?range=${range}&metrics=${metrics.join(",")}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ range, series: {}, radar: null, callouts: ["Could not load trend data."] }));
  }, [range]);

  const hasSeries = (data?.series?.[metric] ?? []).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge">Analytics</span>
            <PoweredByPerfect apis="skin-analysis" />
          </div>
          <h1 className="mt-3 text-3xl font-semibold">Skin Trends</h1>
        </div>
        <div className="flex items-center gap-3">
          <DataModeBadge />
          <div className="flex gap-2">
            {["7d", "30d", "90d"].map((r) => (
              <button key={r} className={r === range ? "btn-primary" : "btn-secondary"} onClick={() => setRange(r)}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!hasSeries ? (
        <EmptyState
          title="No trend history in this range"
          body="Complete at least two saved scans (with Supabase configured) to unlock real trend lines."
          cta="Take Scan"
          href="/scan"
        />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
            <section className="card">
              <div className="flex flex-wrap gap-2">
                {metrics.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={m === metric ? "rounded-full bg-sf-blue px-3 py-1 text-xs font-semibold text-white shadow-sm" : "badge"}
                    onClick={() => setMetric(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <TrendLine data={data?.series?.[metric] ?? []} />
            </section>
            <section className="card">
              <h2 className="font-semibold">Current profile</h2>
              {data?.radar?.current ? (
                <MetricRadar metrics={data.radar.current} />
              ) : (
                <p className="mt-3 text-sm text-sf-muted">Not enough scans in this range for radar comparison.</p>
              )}
            </section>
          </div>
          <section className="grid gap-4 md:grid-cols-3">
            {(data?.callouts ?? []).map((c) => (
              <div className="card" key={c}>
                <p className="text-sm text-sf-ink">{c}</p>
              </div>
            ))}
          </section>
        </>
      )}
      <Link href="/future" className="btn-primary">
        See Future Simulation
      </Link>
    </div>
  );
}
