"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DataModeBadge } from "@/components/DataModeBadge";
import { Disclaimer } from "@/components/Disclaimer";
import { PageHeader } from "@/components/PageHeader";
import { PoweredByPerfect } from "@/components/PoweredByPerfect";
import { getAccessToken } from "@/lib/auth/authClient";
import type { Insight } from "@/lib/types";

type Status = "loading" | "ready" | "error";

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    getAccessToken()
      .then((token) => {
        if (!token) throw new Error("missing token");
        return fetch("/api/insights", { headers: { Authorization: `Bearer ${token}` } });
      })
      .then((r) => r.json())
      .then((data) => {
        const next = Array.isArray((data as { insights?: unknown[] }).insights)
          ? ((data as { insights: Insight[] }).insights ?? [])
          : [];
        setInsights(next);
        setStatus("ready");
      })
      .catch(() => {
        setInsights([]);
        setStatus("error");
      });
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Pattern detection"
        title={<>Your skin <span className="italic">patterns</span></>}
        intro="Insights connect your habit logs and product changes to shifts in your scan scores. The more days you log, the more confident the patterns get."
        accent="rose"
      >
        <PoweredByPerfect apis="skin-analysis" variant="chip" />
        <DataModeBadge />
      </PageHeader>

      {status === "loading" ? (
        <section className="grid gap-4">
          {[0, 1].map((i) => (
            <article key={i} className="card animate-pulse space-y-3">
              <div className="h-4 w-1/3 rounded bg-sf-blue-soft" />
              <div className="h-3 w-3/4 rounded bg-sf-blue-soft/70" />
              <div className="h-3 w-2/3 rounded bg-sf-blue-soft/50" />
            </article>
          ))}
        </section>
      ) : insights.length === 0 ? (
        <section className="space-y-4">
          <div className="card border-dashed">
            <p className="text-sm font-semibold text-sf-ink">No evidence-backed patterns yet</p>
            <p className="mt-2 text-sm text-sf-muted">
              Log at least 3 days of habits and complete a couple of scans. Once we have enough signal, you&apos;ll see cards like the example below.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link className="btn-primary" href="/habits">
                Log Today
              </Link>
              <Link className="btn-secondary" href="/scan">
                Take Scan
              </Link>
            </div>
          </div>
          <article className="card opacity-90">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-sf-blue-deep">
              Example · what you&apos;ll see
            </p>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">Low sleep may be affecting dark circles.</h2>
              <span className="badge">medium confidence</span>
            </div>
            <p className="mt-2 text-sf-muted">
              Your recent sleep average is below target while dark circles is one of your lower scoring areas.
            </p>
            <ul className="mt-4 list-inside list-disc text-sm text-sf-muted">
              <li>Average sleep: 5.8 hours</li>
              <li>Dark circle score: 62/100</li>
            </ul>
            <p className="mt-4 text-sm font-medium">
              Action: aim for 7+ hours of sleep for the next three nights and compare your next scan.
            </p>
          </article>
        </section>
      ) : (
        <section className="grid gap-4">
          {insights.map((i, idx) => (
            <article className="card" key={idx}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-lg font-semibold">{i.title}</h2>
                <span className="badge">{i.confidence} confidence</span>
              </div>
              <p className="mt-2 text-sf-muted">{i.description}</p>
              <ul className="mt-4 list-inside list-disc text-sm text-sf-muted">
                {Array.isArray(i.evidence)
                  ? i.evidence.map((e) => <li key={e}>{e}</li>)
                  : Object.entries(i.evidence).map(([k, v]) => (
                      <li key={k}>
                        {k}: {String(v)}
                      </li>
                    ))}
              </ul>
              <p className="mt-4 text-sm font-medium">Action: {i.recommendedAction}</p>
            </article>
          ))}
        </section>
      )}

      <Disclaimer />
      <div className="flex gap-3">
        <Link className="btn-primary" href="/routine">
          Update Routine
        </Link>
        <Link className="btn-secondary" href="/habits">
          Log Habits
        </Link>
      </div>
    </div>
  );
}
