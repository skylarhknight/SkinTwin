"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TrendLine({ data }: { data: { date: string; value: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 12 }}>
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="currentColor" strokeWidth={2} dot={false} className="text-sf-blue-deep" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
