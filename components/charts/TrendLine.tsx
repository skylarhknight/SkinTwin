"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TrendLine({ data }: { data: { date: string; value: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 12 }}>
          <defs>
            <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6e5570" />
              <stop offset="100%" stopColor="#d98a82" />
            </linearGradient>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a06a7e" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#a06a7e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e7ddd3" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8c8088" }} tickLine={false} axisLine={{ stroke: "#e7ddd3" }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#8c8088" }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 14,
              border: "1px solid #e7ddd3",
              background: "rgba(255,253,251,.95)",
              boxShadow: "0 12px 30px -18px rgba(74,54,66,.4)",
              fontSize: 12,
            }}
          />
          <Area type="monotone" dataKey="value" stroke="url(#trendStroke)" strokeWidth={2.5} fill="url(#trendFill)" dot={false} activeDot={{ r: 4, fill: "#6e5570" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
