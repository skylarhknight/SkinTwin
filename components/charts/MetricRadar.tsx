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
