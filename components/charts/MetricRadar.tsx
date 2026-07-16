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

export function MetricRadar({ metrics }: { metrics: SkinMetrics }) {
  const data = Object.entries(metrics).map(([key, value]) => ({ metric: labels[key as keyof SkinMetrics], value }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
          <Radar dataKey="value" fill="currentColor" fillOpacity={0.18} stroke="currentColor" className="text-sf-blue-deep" />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
