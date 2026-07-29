"use client";

import type { ReactNode } from "react";

type PerfectApi = "skin-analysis" | "facial-tone" | "skin-simulation";

const META: Record<PerfectApi, { label: string; short: string }> = {
  "skin-analysis": { label: "Perfect Corp · AI Skin Analysis", short: "Skin Analysis" },
  "facial-tone": { label: "Perfect Corp · AI Facial Color Tones", short: "Facial Tone" },
  "skin-simulation": { label: "Perfect Corp · AI Skin Simulation", short: "Skin Simulation" },
};

/** Small "Powered by Perfect Corp" attribution so judges immediately see which API is on each screen. */
export function PoweredByPerfect({
  apis,
  variant = "chip",
  className = "",
}: {
  apis: PerfectApi | PerfectApi[];
  variant?: "chip" | "inline";
  className?: string;
}) {
  const list = Array.isArray(apis) ? apis : [apis];

  if (variant === "inline") {
    return (
      <p className={`text-xs text-sf-muted ${className}`}>
        <span className="font-semibold text-sf-ink">Powered by Perfect Corp</span>{" "}
        <span aria-hidden>·</span>{" "}
        {list.map((api, idx) => (
          <span key={api}>
            {META[api].short}
            {idx < list.length - 1 ? " + " : ""}
          </span>
        ))}
      </p>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-white/60 bg-sf-surface/90 px-3 py-1 text-xs font-medium text-sf-ink shadow-[0_7px_18px_-13px_rgba(74,54,66,.4)] backdrop-blur ${className}`}
      title={list.map((a) => META[a].label).join(" · ")}
    >
      <Sparkle />
      <span className="text-sf-muted">Powered by</span>
      <span className="font-semibold">Perfect Corp</span>
      <span className="hidden text-sf-muted sm:inline">·</span>
      <span className="hidden text-[11px] text-sf-muted sm:inline">
        {list.map((api, idx) => (
          <span key={api}>
            {META[api].short}
            {idx < list.length - 1 ? " + " : ""}
          </span>
        ))}
      </span>
    </span>
  );
}

function Sparkle(): ReactNode {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden className="text-sf-rose">
      <path
        fill="currentColor"
        d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6-5.6-1.9 5.6-1.9L12 2.5zM19 14l.95 2.55L22.5 17.5l-2.55.95L19 21l-.95-2.55L15.5 17.5l2.55-.95L19 14z"
      />
    </svg>
  );
}
