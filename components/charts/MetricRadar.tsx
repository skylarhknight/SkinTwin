"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import type { SkinMetrics } from "@/lib/types";

const labels: Record<keyof SkinMetrics, string> = {
  hydration: "Hydration",
  redness: "Redness",
  acne: "Clarity",
  pores: "Pores",
  texture: "Texture",
  wrinkles: "Lines",
  darkCircles: "Dark Circles",
  pigmentation: "Tone",
  radiance: "Radiance",
  oiliness: "Oil Balance"
};

/**
 * `analyzedKeys` restricts the chart to dimensions Perfect actually measured. Plotting an
 * unmeasured metric would draw a placeholder as if it were a reading.
 */
export function MetricRadar({
  metrics,
  analyzedKeys,
}: {
  metrics: SkinMetrics;
  analyzedKeys?: (keyof SkinMetrics)[];
}) {
  const keys = analyzedKeys?.length
    ? (Object.keys(metrics) as (keyof SkinMetrics)[]).filter((k) => analyzedKeys.includes(k))
    : (Object.keys(metrics) as (keyof SkinMetrics)[]);
  const data = keys.map((key) => ({ metric: labels[key], value: metrics[key] }));

  // A radar needs at least three axes to read as a shape rather than a line.
  if (data.length < 3) return null;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <defs>
            <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6e5570" />
              <stop offset="100%" stopColor="#d98a82" />
            </linearGradient>
          </defs>
          <PolarGrid stroke="#e7ddd3" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#8c8088" }} />
          <Radar dataKey="value" fill="url(#radarFill)" fillOpacity={0.28} stroke="#6e5570" strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
