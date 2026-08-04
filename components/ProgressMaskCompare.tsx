"use client";

import { useMemo, useState } from "react";
import { metricLabel } from "@/lib/skin/metricLabels";
import type { SkinMetrics, SkinScan } from "@/lib/types";

type Props = {
  before: SkinScan;
  after: SkinScan;
};

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

function MaskPane({
  label,
  date,
  baseUrl,
  maskUrl,
  score,
  opacity,
}: {
  label: string;
  date: string;
  baseUrl: string;
  maskUrl?: string;
  score: number;
  opacity: number;
}) {
  const [maskBroken, setMaskBroken] = useState(false);

  return (
    <figure className="space-y-2">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-sf-blue-soft">
        <img
          src={baseUrl}
          alt={`${label} scan from ${date}`}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        {maskUrl && !maskBroken ? (
          <img
            src={maskUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-200"
            style={{ opacity }}
            draggable={false}
            onError={() => setMaskBroken(true)}
          />
        ) : null}
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
          {label} · {date}
        </span>
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-3 py-1 text-sm font-semibold text-white tabular-nums">
          {score}
        </span>
      </div>
      <figcaption className="sr-only">
        {label} scan from {date}, score {score}
      </figcaption>
    </figure>
  );
}

/**
 * The visual half of the progress story: the same Perfect Corp concern mask on two different
 * scans, side by side. Only concerns masked in BOTH scans are offered — a one-sided mask would
 * show a change that was never measured twice.
 */
export function ProgressMaskCompare({ before, after }: Props) {
  const [opacity, setOpacity] = useState(85);

  const shared = useMemo(() => {
    const beforeMasks = new Map((before.maskAssets ?? []).map((m) => [m.metricKey, m]));
    const afterMasks = new Map((after.maskAssets ?? []).map((m) => [m.metricKey, m]));
    return (Object.keys(after.metrics) as (keyof SkinMetrics)[])
      .filter((k) => beforeMasks.has(k) && afterMasks.has(k))
      .map((k) => ({
        key: k,
        label: metricLabel(k),
        beforeUrl: beforeMasks.get(k)!.url,
        afterUrl: afterMasks.get(k)!.url,
        delta: Math.round(after.metrics[k] - before.metrics[k]),
      }));
  }, [before, after]);

  const [activeKey, setActiveKey] = useState<keyof SkinMetrics | null>(null);
  const active = shared.find((s) => s.key === (activeKey ?? shared[0]?.key)) ?? null;

  // Prefer Perfect's resized copies so the overlays line up with what they were rendered against.
  const beforeBase = before.maskBaseUrl || before.imageUrl;
  const afterBase = after.maskBaseUrl || after.imageUrl;
  const hasImages = Boolean(beforeBase && afterBase);
  if (!hasImages) return null;

  return (
    <section data-reveal className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-sf-ink">Same concern, both scans</h2>
        <p className="text-xs text-sf-muted">Perfect Corp mask overlay</p>
      </div>
      <p className="mt-1 text-sm text-sf-muted">
        {active
          ? "The highlighted regions come straight from the AI Skin Analysis API on each date — this is the change, not a rendering of it."
          : "Your two scans, side by side."}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <MaskPane
          label="Before"
          date={before.scanDate}
          baseUrl={beforeBase}
          maskUrl={active?.beforeUrl}
          score={active ? before.metrics[active.key] : before.overallScore}
          opacity={opacity / 100}
        />
        <MaskPane
          label="After"
          date={after.scanDate}
          baseUrl={afterBase}
          maskUrl={active?.afterUrl}
          score={active ? after.metrics[active.key] : after.overallScore}
          opacity={opacity / 100}
        />
      </div>

      {shared.length ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {shared.map((s) => {
              const isActive = s.key === active?.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setActiveKey(s.key)}
                  aria-pressed={isActive}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-sf-blue-deep text-white shadow-sf"
                      : "bg-sf-blue-pale text-sf-ink hover:bg-sf-blue-soft"
                  }`}
                >
                  {s.label}
                  <span
                    className={`ml-2 text-xs tabular-nums ${
                      isActive ? "opacity-90" : s.delta > 0 ? "text-emerald-600" : s.delta < 0 ? "text-rose-600" : "opacity-70"
                    }`}
                  >
                    {signed(s.delta)}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="mt-4 flex items-center gap-3 text-xs text-sf-muted">
            <span className="shrink-0">Overlay strength</span>
            <input
              type="range"
              min={0}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-sf-blue-soft accent-sf-blue-deep"
              aria-label="Mask overlay strength"
            />
            <span className="w-9 shrink-0 text-right tabular-nums">{opacity}%</span>
          </label>
        </>
      ) : (
        <p className="mt-4 rounded-2xl border border-sf-blue-lighter/80 bg-sf-blue-pale px-4 py-3 text-xs text-sf-muted">
          No concern was mask-analyzed in both of these scans, so only the photos are compared here.
        </p>
      )}
    </section>
  );
}
