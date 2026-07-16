"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DataModeBadge } from "@/components/DataModeBadge";
import { DemoSeedButton } from "@/components/DemoSeedButton";
import { PoweredByPerfect } from "@/components/PoweredByPerfect";
import { SkinCardDownload } from "@/components/SkinCardDownload";
import { LS_KEYS } from "@/lib/storage/localStorageKeys";
import type { SimulationResponse } from "@/lib/types";
import { getAccessToken, getCurrentUser, type SkinTwinUser } from "@/lib/auth/authClient";
import type { DailyHabit, Insight, SkinScan } from "@/lib/types";

type DashboardPayload = {
  latestScan: SkinScan | null;
  streaks: { spf: number; routine: number; scan: number };
  todayHabits: DailyHabit | null;
  topInsight: Insight | null;
  activeRoutinePreview: { AM: string[]; PM: string[] };
};

function timeOfDayGreeting(): string {
  if (typeof window === "undefined") return "Welcome back";
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Up late";
}

function topConcernCopy(scan: SkinScan): string {
  const top = scan.topConcerns?.[0];
  if (!top) return "No top concern flagged today.";
  const map: Record<string, string> = {
    hydration: "Hydration is your lower scoring area — focus on a barrier-supporting moisturizer.",
    redness: "Redness is your lower scoring area — pause harsh actives for 48h and reassess.",
    pigmentation: "Pigmentation is your lower scoring area — daily SPF + vitamin C will compound.",
    darkCircles: "Dark circles are your lower scoring area — sleep + caffeine eye care can help.",
    texture: "Texture is your lower scoring area — gentle exfoliation 2x/week can improve smoothness.",
    radiance: "Radiance is your lower scoring area — hydration + vitamin C is the proven combo.",
    acne: "Clarity is your lower scoring area — keep actives consistent and avoid pile-on.",
    pores: "Pores are your lower scoring area — niacinamide + non-comedogenic basics help.",
    wrinkles: "Fine lines are your lower scoring area — daily SPF is the single biggest lever.",
    oiliness: "Oil balance is your lower scoring area — gel cleanser AM, balanced moisturizer PM.",
  };
  return map[top] ?? `${top} is one of your lower scoring areas today.`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [user, setUser] = useState<SkinTwinUser | null>(null);
  const [greeting, setGreeting] = useState("Welcome back");
  const [latestSimImage, setLatestSimImage] = useState<string | null>(null);

  useEffect(() => {
    setGreeting(timeOfDayGreeting());
    getCurrentUser().then(setUser).catch(() => setUser(null));
    try {
      const sims = JSON.parse(localStorage.getItem(LS_KEYS.simulations) || "[]") as SimulationResponse[];
      const latest = sims.at(-1);
      if (latest?.simulatedImageUrl) setLatestSimImage(latest.simulatedImageUrl);
    } catch {
      /* ignore */
    }
    getAccessToken()
      .then((token) => {
        if (!token) throw new Error("missing token");
        return fetch("/api/dashboard", { headers: { Authorization: `Bearer ${token}` } });
      })
      .then((r) => r.json())
      .then((payload) => setData(payload as DashboardPayload))
      .catch(() => setData(null));
  }, []);

  if (!data?.latestScan)
    return (
      <div className="space-y-6">
        <div>
          <span className="badge">Dashboard</span>
          <h1 className="mt-3 text-3xl font-semibold">
            {greeting}{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}.
          </h1>
        </div>
        <div className="card text-center">
          <h2 className="text-xl font-semibold">Your dashboard is ready for a scan</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-sf-muted">
            Take a 30-second selfie scan to unlock your SkinTwin score, trends, personalized routine, and a 20-year future simulation. No camera handy? Seed your account with realistic demo data and explore everything end-to-end.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/scan" className="btn-primary">
              Start Scan
            </Link>
            <DemoSeedButton label="Try with demo data" variant="secondary" />
          </div>
        </div>
      </div>
    );

  const scan = data.latestScan;
  const tone = scan.facialToneData;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="badge">Dashboard</span>
          <h1 className="mt-3 text-3xl font-semibold">
            {greeting}{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}.
          </h1>
          <p className="mt-1 text-sm text-sf-muted">
            Last scan {new Date(scan.scanDate).toLocaleDateString()} · {scan.isMock ? "demo data" : "live analysis"}
          </p>
        </div>
        <DataModeBadge />
      </div>

      <section className="rounded-card border border-[#dde6f5] bg-gradient-to-br from-sf-blue-pale via-white to-sf-yellow-soft p-6 shadow-sf-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-sf-blue-deep">Your skin today</p>
          <PoweredByPerfect apis={tone ? ["skin-analysis", "facial-tone"] : "skin-analysis"} />
        </div>
        <div className="mt-3 grid gap-5 md:grid-cols-[auto_1fr_auto]">
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-3xl bg-white shadow-sf-sm ring-1 ring-sf-blue-lighter/40">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-sf-muted">Score</p>
            <p className="text-3xl font-bold text-sf-blue-deep">{scan.overallScore}</p>
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-base text-sf-ink">{topConcernCopy(scan)}</p>
            {tone ? (
              <p className="mt-2 text-sm text-sf-muted">
                Undertone <span className="font-medium capitalize text-sf-ink">{tone.undertone}</span> · pigmentation index{" "}
                <span className="font-medium text-sf-ink">{tone.pigmentationIndex}</span> · redness index{" "}
                <span className="font-medium text-sf-ink">{tone.rednessIndex}</span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-stretch gap-2 self-center md:items-end">
            <div className="flex flex-wrap gap-2">
              <Link href={`/scan/${scan.id}`} className="btn-secondary text-sm">
                Open report
              </Link>
              <Link href="/future" className="btn-primary text-sm">
                See future
              </Link>
            </div>
            <SkinCardDownload scan={scan} fullName={user?.fullName ?? null} futureImageUrl={latestSimImage} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["SPF streak", `${data.streaks.spf} day${data.streaks.spf === 1 ? "" : "s"}`],
          ["Routine streak", `${data.streaks.routine} day${data.streaks.routine === 1 ? "" : "s"}`],
          ["Scan streak", `${data.streaks.scan} day${data.streaks.scan === 1 ? "" : "s"}`],
        ].map(([a, b]) => (
          <div className="card" key={a}>
            <p className="text-sm text-sf-muted">{a}</p>
            <p className="mt-2 text-3xl font-semibold">{b}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">Top insight</h2>
          <p className="mt-2 text-sf-muted">
            {data.topInsight?.description ??
              "No insight yet. Log a few habit days and complete another scan to generate pattern-based guidance."}
          </p>
          <Link href="/insights" className="btn-secondary mt-5">
            View Insights
          </Link>
        </div>
        <div className="card">
          <h2 className="font-semibold">Today’s habits</h2>
          <p className="mt-2 text-sm text-sf-muted">
            Water: {data.todayHabits?.waterIntakeMl ?? 0}ml · Sleep: {data.todayHabits?.sleepHours ?? 0}h · SPF:{" "}
            {data.todayHabits ? (data.todayHabits.usedSpf ? "Yes" : "No") : "No log"}
          </p>
          <Link href="/habits" className="btn-secondary mt-5">
            Log Habits
          </Link>
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold">Routine preview</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-sf-blue-soft p-4">
            <p className="font-medium">AM</p>
            <p className="text-sm text-sf-muted">
              {data.activeRoutinePreview.AM.length
                ? data.activeRoutinePreview.AM.join(" · ")
                : "No AM routine generated yet."}
            </p>
          </div>
          <div className="rounded-2xl bg-sf-blue-soft p-4">
            <p className="font-medium">PM</p>
            <p className="text-sm text-sf-muted">
              {data.activeRoutinePreview.PM.length
                ? data.activeRoutinePreview.PM.join(" · ")
                : "No PM routine generated yet."}
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/scan" className="btn-primary">
          New Scan
        </Link>
        <Link href="/recommendations" className="btn-secondary">
          Shop For Your Skin
        </Link>
        <Link href="/future" className="btn-secondary">
          See Future
        </Link>
      </div>
    </div>
  );
}
