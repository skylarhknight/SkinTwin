"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PoweredByPerfect } from "@/components/PoweredByPerfect";
import { getCurrentUser, type SkinTwinUser } from "@/lib/auth/authClient";
import { LS_KEYS } from "@/lib/storage/localStorageKeys";
import type { SkinScan } from "@/lib/types";

export default function HomePage() {
  const [user, setUser] = useState<SkinTwinUser | null>(null);
  const [scan, setScan] = useState<SkinScan | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getCurrentUser().then((current) => {
      setUser(current);
      const raw = localStorage.getItem(LS_KEYS.latestScan);
      if (raw) setScan(JSON.parse(raw));
      setLoaded(true);
    });
  }, []);

  if (loaded && user) {
    return (
      <div className="space-y-8 py-8">
        <section className="rounded-card border border-white/20 bg-sf-blue p-8 text-white shadow-sf md:p-10">
          <span className="inline-flex rounded-full bg-sf-yellow/90 px-3 py-1 text-xs font-semibold text-sf-ink shadow-sm">
            Signed in
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">
            Welcome back{user.fullName ? `, ${user.fullName}` : ""}.
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-white/90">
            Continue your skincare feedback loop with a new scan, habit log, routine update, or future simulation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-sf-blue shadow-sm hover:bg-sf-yellow-soft"
            >
              Open Dashboard
            </Link>
            <Link
              href="/scan"
              className="rounded-full border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
            >
              Take New Scan
            </Link>
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-4">
          <div className="card">
            <p className="text-sm text-sf-muted">Latest score</p>
            <p className="mt-2 text-5xl font-semibold text-sf-ink">{scan?.overallScore ?? "—"}</p>
          </div>
          {[
            ["Scan", "/scan", "Capture today's skin state."],
            ["Habits", "/habits", "Log sleep, water, SPF, and stress."],
            ["Routine", "/routine", "Review your AM/PM plan."],
          ].map(([title, href, body]) => (
            <Link key={href} href={href} className="card block transition-colors hover:bg-sf-blue-pale">
              <h2 className="font-semibold text-sf-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-sf-muted">{body}</p>
            </Link>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-12 py-8">
      <section className="grid items-center gap-10 md:grid-cols-[1.15fr_.85fr]">
        <div>
          <PoweredByPerfect apis={["skin-analysis", "facial-tone", "skin-simulation"]} />
          <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-tight text-sf-ink md:text-7xl">
            Track your skin. <span className="text-sf-blue-deep">See your future.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-sf-muted">
            SkinTwin turns daily selfies into a measurable skin score, learns from your habits, and uses Perfect Corp&apos;s AI Skin Simulation to show you what 20 years of your choices actually look like.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary">
              Log in
            </Link>
            <Link href="/login?next=/onboarding" className="btn-secondary">
              Create account
            </Link>
          </div>
          <p className="mt-4 text-sm text-sf-muted">
            Sign in to keep your scans, trends, routines, and simulations tied to your account.
          </p>
        </div>

        <div className="card shadow-sf">
          <div className="rounded-card bg-gradient-to-br from-sf-blue-soft via-sf-yellow-soft to-sf-blue-pale p-5">
            <div className="space-y-3 rounded-[1.4rem] border border-white/80 bg-white/90 p-5 shadow-inner">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-sf-muted">Today&apos;s Skin Report</p>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  Live analysis
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-sf-blue-pale p-4 ring-1 ring-sf-blue-lighter/40">
                  <p className="text-xs font-medium text-sf-muted">SkinTwin Score</p>
                  <p className="mt-1 text-4xl font-bold text-sf-blue-deep">78</p>
                </div>
                <div className="rounded-2xl bg-sf-yellow-soft p-4 ring-1 ring-[#efe4ab]">
                  <p className="text-xs font-medium text-sf-muted">Undertone</p>
                  <p className="mt-1 text-2xl font-semibold capitalize text-sf-ink">Neutral</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  ["Hydration", 82],
                  ["Pigmentation", 71],
                  ["Radiance", 76],
                ].map(([label, val]) => (
                  <div key={String(label)}>
                    <div className="flex justify-between text-[11px] font-medium text-sf-muted">
                      <span>{label}</span>
                      <span>{val}/100</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-sf-blue-soft">
                      <div
                        className="h-full bg-sf-blue-deep"
                        style={{ width: `${Number(val)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-sf-yellow/60 bg-sf-yellow-soft px-3 py-2 text-[11px] leading-snug text-sf-ink">
                <span className="font-semibold">Top concern:</span> pigmentation. Pair daily SPF with vitamin C this week.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-sf-blue-deep">How it works</p>
        <h2 className="mt-2 text-3xl font-semibold text-sf-ink">Three steps, one feedback loop.</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              n: "1",
              title: "Scan",
              body: "Take a quick selfie. Perfect Corp runs AI Skin Analysis and Facial Color Tones to give you a SkinTwin score, undertone, and ranked concerns.",
              api: "Skin Analysis + Facial Tone",
            },
            {
              n: "2",
              title: "Track",
              body: "Log sleep, water, SPF, and product changes. Trends and pattern-detected insights connect your habits to your skin score over time.",
              api: "Skin Analysis (history)",
            },
            {
              n: "3",
              title: "Simulate",
              body: "See yourself in 5, 10, or 20 years across four lifestyle scenarios — consistent SPF, current trajectory, skipped SPF, or no routine — with a side-by-side compare slider.",
              api: "AI Skin Simulation",
            },
          ].map((s) => (
            <div key={s.n} className="card">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sf-blue text-sm font-bold text-white">
                {s.n}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-sf-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-sf-muted">{s.body}</p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-sf-blue-deep">{s.api}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card bg-sf-blue-pale/60">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Built on Perfect Corp", "Three Perfect Corp APIs power every scan, tone read, and future simulation."],
            ["Tied to your account", "Scans, habits, products, routines, and simulations all persist to your login."],
            ["Made for daily use", "Designed as a feedback loop you actually return to — not a one-shot novelty."],
          ].map(([t, b]) => (
            <div key={t}>
              <p className="text-sm font-semibold text-sf-ink">{t}</p>
              <p className="mt-1 text-sm leading-6 text-sf-muted">{b}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
