"use client";

import { useEffect, useMemo, useState } from "react";
import { LS_KEYS } from "@/lib/storage/localStorageKeys";
import type { SimulationResponse, SkinScan } from "@/lib/types";

type DataMode = "live" | "demo" | "mixed" | "unknown";

export function DataModeBadge() {
  const [mode, setMode] = useState<DataMode>("unknown");

  useEffect(() => {
    try {
      const latestScan = JSON.parse(localStorage.getItem(LS_KEYS.latestScan) || "null") as SkinScan | null;
      const sims = JSON.parse(localStorage.getItem(LS_KEYS.simulations) || "[]") as SimulationResponse[];
      const latestSim = sims.at(-1) ?? null;

      const hasLive = Boolean((latestScan && !latestScan.isMock) || (latestSim && !latestSim.isMock));
      const hasDemo = Boolean((latestScan && latestScan.isMock) || (latestSim && latestSim.isMock));

      if (hasLive && hasDemo) setMode("mixed");
      else if (hasLive) setMode("live");
      else if (hasDemo) setMode("demo");
      else setMode("unknown");
    } catch {
      setMode("unknown");
    }
  }, []);

  const ui = useMemo(() => {
    if (mode === "live") return { label: "Live data", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
    if (mode === "demo") return { label: "Demo data", cls: "bg-amber-50 text-amber-700 ring-amber-200" };
    if (mode === "mixed") return { label: "Mixed data", cls: "bg-sf-plum-soft text-sf-plum ring-sf-lilac/50" };
    return { label: "No data yet", cls: "bg-sf-champagne-soft text-sf-ink ring-sf-champagne/40" };
  }, [mode]);

  return <span className={`badge ring-1 ${ui.cls}`}>{ui.label}</span>;
}
