"use client";

import { useEffect, useRef, useState } from "react";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { DataModeBadge } from "@/components/DataModeBadge";
import { Disclaimer } from "@/components/Disclaimer";
import { PoweredByPerfect } from "@/components/PoweredByPerfect";
import { getAccessToken } from "@/lib/auth/authClient";
import { LS_KEYS } from "@/lib/storage/localStorageKeys";
import type { SimulationResponse, SimulationScenario, SkinScan } from "@/lib/types";

const scenarios: { id: SimulationScenario; title: string; tagline: string; icon: string; tone: string }[] = [
  {
    id: "consistent_spf_routine",
    title: "Consistent SPF + Routine",
    tagline: "Daily SPF, AM/PM routine kept up",
    icon: "☀️",
    tone: "from-emerald-100 to-emerald-50",
  },
  {
    id: "current_trajectory",
    title: "Current Trajectory",
    tagline: "Keeps your present habit consistency",
    icon: "🧭",
    tone: "from-sf-blue-soft to-sf-blue-pale",
  },
  {
    id: "skip_spf",
    title: "Skip SPF",
    tagline: "No daily sun protection",
    icon: "🌞",
    tone: "from-amber-100 to-amber-50",
  },
  {
    id: "stop_routine",
    title: "Stop Routine",
    tagline: "Skincare routine abandoned",
    icon: "💤",
    tone: "from-rose-100 to-rose-50",
  },
];

const VERDICTS: Record<SimulationScenario, string> = {
  consistent_spf_routine:
    "Best-case path. Visible signs of UV damage and pigmentation are minimized; texture and tone stay closer to baseline.",
  current_trajectory:
    "Your habits today, projected forward. Useful as a neutral comparison against the better and worse scenarios.",
  skip_spf:
    "Photoaging risk. Pigmentation, fine lines, and uneven tone tend to advance fastest in scenarios without daily sun protection.",
  stop_routine:
    "Worst-case path. Without consistent care, hydration, redness, and texture scores tend to drift down the most.",
};

const YEAR_OPTIONS = [5, 10, 20];

/** Longer than server pipeline timeout so the API can return JSON errors first. */
const SIMULATION_FETCH_MS = 150_000;

export default function FuturePage() {
  const [scan, setScan] = useState<SkinScan | null>(null);
  const [latestImage, setLatestImage] = useState<string>("");
  const [scenario, setScenario] = useState<SimulationScenario>("consistent_spf_routine");
  const [years, setYears] = useState<number>(20);
  const [sim, setSim] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [genError, setGenError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const s = localStorage.getItem(LS_KEYS.latestScan);
    if (s) setScan(JSON.parse(s));
    setLatestImage(localStorage.getItem(LS_KEYS.latestImage) || "");
  }, []);

  const cancelGenerate = () => {
    abortRef.current?.abort();
  };

  const generate = async () => {
    setGenError("");
    setLoading(true);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const tid = setTimeout(() => ac.abort(), SIMULATION_FETCH_MS);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Please sign in again to continue.");
      const res = await fetch("/api/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        signal: ac.signal,
        body: JSON.stringify({
          sourceImageUrl: latestImage || scan?.imageUrl,
          scenarioType: scenario,
          simulationYears: years,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Simulation request failed");
      setSim(data as SimulationResponse);
      const arr = JSON.parse(localStorage.getItem(LS_KEYS.simulations) || "[]");
      localStorage.setItem(LS_KEYS.simulations, JSON.stringify([...arr, data]));
    } catch (e) {
      const aborted =
        (e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError");
      if (aborted) {
        setGenError(
          "Cancelled or timed out. If this keeps happening, avoid stopping the dev server during a run, or try again with a smaller photo."
        );
      } else {
        setGenError(e instanceof Error ? e.message : "Simulation failed");
      }
    } finally {
      clearTimeout(tid);
      abortRef.current = null;
      setLoading(false);
    }
  };

  const source = latestImage || scan?.imageUrl || "/mock/skin-scan-placeholder.svg";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="badge">Future simulation</span>
          <div className="flex items-center gap-2">
            <PoweredByPerfect apis="skin-simulation" />
            <DataModeBadge />
          </div>
        </div>
        <h1 className="mt-3 text-3xl font-semibold">See Your Skin Future</h1>
        <p className="mt-2 max-w-2xl text-sf-muted">
          A {years}-year illustrative simulation of your face under four different lifestyle scenarios. Drag the slider to compare today vs your future self.
        </p>
      </div>

      <section className="card space-y-5">
        <div>
          <p className="text-sm font-semibold text-sf-ink">1. Pick a scenario</p>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            {scenarios.map((s) => {
              const active = scenario === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScenario(s.id)}
                  className={`group rounded-2xl border p-4 text-left transition-shadow ${
                    active
                      ? "border-sf-blue-deep bg-sf-blue-soft shadow-sf"
                      : "border-[#dbe4f4] bg-white shadow-sf-sm hover:shadow-sf"
                  }`}
                >
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${s.tone} text-2xl`}
                    aria-hidden
                  >
                    {s.icon}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-sf-ink">{s.title}</p>
                  <p className="mt-1 text-xs leading-5 text-sf-muted">{s.tagline}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-sf-ink">2. Choose a horizon</p>
          <div className="mt-3 flex gap-2">
            {YEAR_OPTIONS.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYears(y)}
                className={
                  y === years
                    ? "rounded-full bg-sf-blue px-4 py-1.5 text-sm font-semibold text-white shadow-sf-sm"
                    : "rounded-full border border-[#dbe4f4] bg-white px-4 py-1.5 text-sm font-medium text-sf-ink shadow-sm hover:bg-sf-blue-soft"
                }
              >
                {y} years
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary" type="button" onClick={generate} disabled={loading}>
            {loading ? "Generating..." : "Generate Simulation"}
          </button>
          {loading ? (
            <button type="button" className="btn-secondary text-sm" onClick={cancelGenerate}>
              Cancel
            </button>
          ) : null}
        </div>
        {loading ? (
          <p className="text-sm text-sf-muted">
            Perfect&apos;s skin simulation can take up to about two minutes. Leave this tab open while it runs.
          </p>
        ) : null}
        {genError ? <p className="text-sm text-red-600">{genError}</p> : null}
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Compare today vs future</h2>
          {sim?.isMock ? <span className="badge">Demo data</span> : null}
        </div>

        {loading ? (
          <div className="mt-4 flex aspect-square w-full max-w-xl flex-col items-center justify-center gap-3 rounded-3xl bg-sf-blue-soft px-6 text-center text-sf-muted">
            <span
              className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-sf-blue border-t-transparent"
              aria-hidden
            />
            <p className="text-sm font-medium text-sf-ink">Creating your simulation…</p>
            <p className="text-xs">This usually finishes within two minutes.</p>
          </div>
        ) : !sim ? (
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sf-muted">Today</p>
              <img
                src={source}
                alt="Current scan"
                className="mt-2 aspect-square w-full rounded-3xl bg-sf-blue-soft object-cover"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sf-muted">Future</p>
              <div className="mt-2 flex aspect-square w-full items-center justify-center rounded-3xl bg-sf-blue-soft text-center text-sf-muted">
                Generate a scenario to see your future self
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-6 md:grid-cols-[1.1fr_.9fr]">
            <BeforeAfterSlider
              beforeSrc={source}
              afterSrc={sim.simulatedImageUrl}
              beforeLabel="Today"
              afterLabel={`+${sim.simulationYears}y · ${prettyScenario(sim.scenarioType)}`}
            />
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-sf-muted">Scenario</p>
                <p className="mt-1 text-lg font-semibold text-sf-ink">{prettyScenario(sim.scenarioType)}</p>
                <p className="mt-2 text-sm leading-6 text-sf-muted">{sim.scenarioDescription}</p>
              </div>
              <div className="rounded-2xl border border-sf-blue-lighter/70 bg-sf-blue-pale/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-sf-blue-deep">Lifestyle verdict</p>
                <p className="mt-2 text-sm leading-6 text-sf-ink">{VERDICTS[sim.scenarioType]}</p>
              </div>
              {sim.isMock ? (
                <p className="text-xs text-sf-muted">
                  {sim.mockFallbackNote ? (
                    <>
                      <span className="font-medium text-sf-ink">Why demo data: </span>
                      {sim.mockFallbackNote}
                    </>
                  ) : (
                    <>Showing a placeholder — Perfect API is not configured for live simulation right now.</>
                  )}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <Disclaimer />
    </div>
  );
}

function prettyScenario(s: SimulationScenario): string {
  return s.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
