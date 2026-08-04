"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Disclaimer } from "@/components/Disclaimer";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { PoweredByPerfect } from "@/components/PoweredByPerfect";
import { ProgressMaskCompare } from "@/components/ProgressMaskCompare";
import { getAccessToken, getCurrentUser } from "@/lib/auth/authClient";
import { MEANINGFUL_DELTA, type ProgressReport } from "@/lib/skin/progress";

type ScanIndexItem = {
  id: string;
  scanDate: string;
  overallScore: number;
  isMock: boolean;
};

type ProgressPayload = {
  report: ProgressReport | null;
  scans: ScanIndexItem[];
  reason?: string;
};

function deltaClass(direction: "improved" | "declined" | "steady"): string {
  if (direction === "improved") return "text-emerald-600";
  if (direction === "declined") return "text-rose-600";
  return "text-sf-muted";
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

const CONFIDENCE_COPY: Record<"low" | "medium" | "high", string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

export default function ProgressPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<ProgressPayload | null>(null);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (from?: string, to?: string) => {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Please sign in again to continue.");
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const query = params.toString();
      const res = await fetch(`/api/progress${query ? `?${query}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as ProgressPayload & { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not load your progress.");
      setPayload(data);
      if (data.report) {
        setFromId(data.report.before.id);
        setToId(data.report.after.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your progress.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        if (!u) {
          router.replace("/login");
          return;
        }
        void load();
      })
      .catch(() => router.replace("/login"));
  }, [router, load]);

  if (loading && !payload) {
    return (
      <div className="mx-auto max-w-5xl">
        <section className="card">
          <p className="text-sm text-sf-muted">Comparing your scans...</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <section className="card">
          <p className="text-sm text-red-700">{error}</p>
        </section>
      </div>
    );
  }

  const report = payload?.report ?? null;
  const scans = payload?.scans ?? [];

  if (!report) {
    return (
      <EmptyState
        title="Not enough scans yet"
        body={payload?.reason ?? "Take at least two scans on different days to see what changed."}
        cta="Take a scan"
        href="/scan"
      />
    );
  }

  const improved = report.metricDeltas.filter((d) => d.direction === "improved");
  const declined = report.metricDeltas.filter((d) => d.direction === "declined");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Progress"
        title={
          <>
            What actually <span className="italic">changed</span>
          </>
        }
        intro="Two scans, measured the same way, with everything you logged in between. This is the evidence that your routine is working — or that it is not."
      >
        <PoweredByPerfect apis={["skin-analysis"]} className="shrink-0" />
      </PageHeader>

      {scans.length > 2 ? (
        <section className="card flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-sf-muted">
            Compare from
            <select
              className="rounded-xl border border-sf-line bg-sf-surface px-3 py-2 text-sm text-sf-ink"
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
            >
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.scanDate} — score {s.overallScore}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-sf-muted">
            to
            <select
              className="rounded-xl border border-sf-line bg-sf-surface px-3 py-2 text-sm text-sf-ink"
              value={toId}
              onChange={(e) => setToId(e.target.value)}
            >
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.scanDate} — score {s.overallScore}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void load(fromId, toId)}
            disabled={loading}
          >
            {loading ? "Comparing..." : "Compare"}
          </button>
        </section>
      ) : null}

      <section data-reveal className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-sf-blue-deep">
              {report.before.scanDate} → {report.after.scanDate} · {report.daysBetween} days
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-sf-ink">{report.verdict}</h2>
          </div>
          <div className="text-center">
            <p className="text-sm text-sf-muted">SkinTwin score</p>
            <p className="text-5xl font-semibold text-sf-ink">
              {report.before.overallScore}
              <span className="mx-2 text-2xl text-sf-muted">→</span>
              {report.after.overallScore}
            </p>
            <p
              className={`mt-1 text-sm font-semibold ${deltaClass(
                report.overallDelta >= MEANINGFUL_DELTA
                  ? "improved"
                  : report.overallDelta <= -MEANINGFUL_DELTA
                    ? "declined"
                    : "steady"
              )}`}
            >
              {signed(report.overallDelta)} points
            </p>
          </div>
        </div>
      </section>

      <ProgressMaskCompare before={report.before} after={report.after} />

      <section data-reveal className="card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-sf-ink">Measured change</h2>
          <p className="text-xs text-sf-muted">
            Moves within ±{MEANINGFUL_DELTA} points are treated as measurement noise
          </p>
        </div>

        {report.metricDeltas.length === 0 ? (
          <p className="mt-3 text-sm text-sf-muted">
            These two scans measured different dimensions, so there is nothing directly comparable.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {report.metricDeltas.map((d) => (
              <div
                key={d.key}
                className="flex items-center gap-4 rounded-2xl border border-sf-blue-lighter/70 bg-sf-blue-pale/50 px-4 py-3"
              >
                <p className="w-28 shrink-0 text-sm font-medium text-sf-ink">{d.label}</p>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/70">
                  <div
                    className="absolute inset-y-0 bg-sf-blue-deep/30"
                    style={{ width: `${Math.max(0, Math.min(100, d.before))}%` }}
                  />
                  <div
                    className={`absolute inset-y-0 ${
                      d.direction === "declined" ? "bg-rose-400" : "bg-sf-blue-deep"
                    }`}
                    style={{
                      left: `${Math.min(d.before, d.after)}%`,
                      width: `${Math.abs(d.after - d.before)}%`,
                    }}
                  />
                </div>
                <p className="w-24 shrink-0 text-right text-sm tabular-nums text-sf-muted">
                  {d.before} → <span className="font-semibold text-sf-ink">{d.after}</span>
                </p>
                <p className={`w-12 shrink-0 text-right text-sm font-semibold tabular-nums ${deltaClass(d.direction)}`}>
                  {signed(d.delta)}
                </p>
              </div>
            ))}
          </div>
        )}

        {report.notComparable.length ? (
          <p className="mt-4 rounded-2xl border border-sf-blue-lighter/80 bg-sf-blue-pale px-4 py-3 text-xs text-sf-muted">
            Excluded because only one of these two scans measured them:{" "}
            <span className="font-medium text-sf-ink">
              {report.notComparable.map((n) => n.label).join(", ")}
            </span>
            . Comparing a measured score against an unmeasured one would invent a trend.
          </p>
        ) : null}
      </section>

      <section data-reveal className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold text-sf-ink">What you did in between</h2>
          {report.adherence ? (
            <dl className="mt-4 grid grid-cols-2 gap-3">
              {[
                ["Days logged", `${report.adherence.daysLogged}/${report.adherence.daysInWindow}`],
                ["SPF adherence", `${report.adherence.spfRate}%`],
                [
                  "Avg sleep",
                  report.adherence.avgSleep !== undefined ? `${report.adherence.avgSleep.toFixed(1)}h` : "—",
                ],
                [
                  "Avg water",
                  report.adherence.avgWater !== undefined
                    ? `${Math.round(report.adherence.avgWater)}ml`
                    : "—",
                ],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-sf-blue-lighter/70 bg-sf-blue-pale/50 p-3">
                  <dt className="text-xs text-sf-muted">{label}</dt>
                  <dd className="mt-1 text-lg font-semibold text-sf-ink">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-sf-muted">
              No habits were logged between these scans, so the change cannot be attributed to anything.{" "}
              <Link className="underline" href="/habits">
                Start logging
              </Link>{" "}
              to make the next comparison explainable.
            </p>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-sf-ink">Products in this window</h2>
          {report.productsStarted.length || report.productsRunning.length || report.productsStopped.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {report.productsStarted.map((p) => (
                <li key={p.id} className="flex items-start gap-2">
                  <span className="badge shrink-0">Started</span>
                  <span className="text-sf-ink">{p.name}</span>
                </li>
              ))}
              {report.productsRunning.map((p) => (
                <li key={p.id} className="flex items-start gap-2">
                  <span className="badge shrink-0">Ongoing</span>
                  <span className="text-sf-ink">{p.name}</span>
                </li>
              ))}
              {report.productsStopped.map((p) => (
                <li key={p.id} className="flex items-start gap-2">
                  <span className="badge shrink-0">Stopped</span>
                  <span className="text-sf-ink">{p.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-sf-muted">
              No products were on your shelf during this window.{" "}
              <Link className="underline" href="/products">
                Add what you use
              </Link>{" "}
              to connect products to results.
            </p>
          )}
        </div>
      </section>

      <section data-reveal className="card">
        <h2 className="font-semibold text-sf-ink">Why it may have changed</h2>
        <p className="mt-1 text-sm text-sf-muted">
          These are timing overlaps between what you logged and what the scans measured. They are
          associations, not proof of cause.
        </p>
        {report.attributions.length ? (
          <div className="mt-4 space-y-3">
            {report.attributions.map((a, i) => (
              <div
                key={`${a.metricKey}-${i}`}
                className="rounded-2xl border border-sf-blue-lighter/70 bg-sf-blue-pale/50 p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-sf-ink">{a.headline}</p>
                  <span className="badge shrink-0">{CONFIDENCE_COPY[a.confidence]}</span>
                </div>
                <p className="mt-2 text-sm text-sf-muted">{a.detail}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {a.evidence.map((e) => (
                    <li
                      key={e}
                      className="rounded-full bg-white/70 px-3 py-1 text-xs tabular-nums text-sf-ink"
                    >
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-sf-muted">
            Nothing you logged lines up clearly with the measured changes yet. Longer windows with more
            consistent logging produce stronger links.
          </p>
        )}
      </section>

      {improved.length || declined.length ? (
        <section data-reveal className="card">
          <h2 className="font-semibold text-sf-ink">What to do next</h2>
          <ul className="mt-3 space-y-2 text-sm text-sf-ink">
            {improved.length ? (
              <li>
                Keep going on{" "}
                <span className="font-medium">{improved.map((d) => d.label.toLowerCase()).join(", ")}</span> —
                whatever you did over these {report.daysBetween} days is measurably working.
              </li>
            ) : null}
            {declined.length ? (
              <li>
                <span className="font-medium">{declined.map((d) => d.label.toLowerCase()).join(", ")}</span>{" "}
                moved the wrong way. Revisit your routine before adding anything new.
              </li>
            ) : null}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="btn-primary" href="/scan">
              Take next scan
            </Link>
            <Link className="btn-secondary" href="/routine">
              Adjust routine
            </Link>
          </div>
        </section>
      ) : null}

      <Disclaimer />
    </div>
  );
}
