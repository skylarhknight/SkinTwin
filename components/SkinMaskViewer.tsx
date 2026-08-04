"use client";

import { useEffect, useMemo, useState } from "react";
import { metricLabel } from "@/lib/skin/metricLabels";
import type { SkinMaskAsset, SkinMetrics } from "@/lib/types";

type Props = {
  /** The selfie this scan was run on. */
  baseImageUrl: string;
  masks: SkinMaskAsset[];
  metrics: SkinMetrics;
  className?: string;
};

function bandColor(value: number): string {
  if (value >= 80) return "text-emerald-600";
  if (value >= 65) return "text-sf-blue-deep";
  if (value >= 50) return "text-amber-600";
  return "text-rose-600";
}

/**
 * Renders Perfect Corp's per-concern mask overlays on top of the user's selfie.
 *
 * One mask at a time rather than stacking: Perfect returns full-frame renders, so layering two
 * would just hide the lower one while implying both are visible.
 */
export function SkinMaskViewer({ baseImageUrl, masks, metrics, className = "" }: Props) {
  const [activeKey, setActiveKey] = useState<keyof SkinMetrics | null>(masks[0]?.metricKey ?? null);
  const [opacity, setOpacity] = useState(85);
  const [peeking, setPeeking] = useState(false);
  const [failed, setFailed] = useState<Set<string>>(new Set());

  const usable = useMemo(() => masks.filter((m) => !failed.has(m.metricKey)), [masks, failed]);

  // If the selected overlay 404s, fall forward to one that still loads rather than showing nothing.
  useEffect(() => {
    if (activeKey && failed.has(activeKey)) {
      setActiveKey(usable[0]?.metricKey ?? null);
    }
  }, [activeKey, failed, usable]);

  if (!usable.length) return null;

  const active = usable.find((m) => m.metricKey === activeKey) ?? null;
  const effectiveOpacity = peeking ? 0 : opacity / 100;

  return (
    <section className={`card ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-sf-ink">Where we saw it</h2>
        <p className="text-xs text-sf-muted">Perfect Corp mask overlay</p>
      </div>
      <p className="mt-1 text-sm text-sf-muted">
        Each overlay is returned by the AI Skin Analysis API and shows the exact regions that produced
        the score — not an illustration.
      </p>

      <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden rounded-3xl bg-sf-blue-soft">
        <img
          src={baseImageUrl}
          alt="Your scan"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        {active ? (
          <img
            key={active.metricKey}
            src={active.url}
            alt={`${metricLabel(active.metricKey)} mask overlay`}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-200"
            style={{ opacity: effectiveOpacity }}
            draggable={false}
            onError={() =>
              setFailed((prev) => {
                const next = new Set(prev);
                next.add(active.metricKey);
                return next;
              })
            }
          />
        ) : null}

        {active ? (
          <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
            {metricLabel(active.metricKey)}
            <span className={`ml-2 font-semibold ${bandColor(metrics[active.metricKey])} brightness-150`}>
              {metrics[active.metricKey]}
            </span>
          </div>
        ) : null}

        <button
          type="button"
          className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-black/70"
          onPointerDown={() => setPeeking(true)}
          onPointerUp={() => setPeeking(false)}
          onPointerLeave={() => setPeeking(false)}
          onBlur={() => setPeeking(false)}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") setPeeking(true);
          }}
          onKeyUp={() => setPeeking(false)}
        >
          Hold to see original
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {usable.map((mask) => {
          const isActive = mask.metricKey === activeKey;
          return (
            <button
              key={mask.metricKey}
              type="button"
              onClick={() => setActiveKey(mask.metricKey)}
              aria-pressed={isActive}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-sf-blue-deep text-white shadow-sf"
                  : "bg-sf-blue-pale text-sf-ink hover:bg-sf-blue-soft"
              }`}
            >
              {metricLabel(mask.metricKey)}
              <span className="ml-2 text-xs opacity-80">{metrics[mask.metricKey]}</span>
            </button>
          );
        })}
      </div>

      <label className="mt-4 flex items-center gap-3 text-xs text-sf-muted">
        <span className="shrink-0">Overlay strength</span>
        <input
          type="range"
          min={20}
          max={100}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-sf-blue-soft accent-sf-blue-deep"
          aria-label="Mask overlay strength"
        />
        <span className="w-9 shrink-0 text-right tabular-nums">{opacity}%</span>
      </label>
    </section>
  );
}
