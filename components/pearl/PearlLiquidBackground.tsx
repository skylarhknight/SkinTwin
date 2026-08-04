"use client";

import { usePathname } from "next/navigation";
import { PearlSurface } from "./PearlSurface";
import { pearlVariantForRoute } from "./pearlRoute";

/**
 * Full-page pearl liquid-glass background for interior routes.
 *
 * Fixed to the viewport so it stays continuous through long pages and across
 * route changes, and pinned to `z-index: -1` — above the warm ambient glows
 * painted by `body::before`, below the film grain in `body::after`, and below
 * every piece of page content.
 *
 * The composition is seeded from the route, so each page has its own phase and
 * undertone while staying obviously part of one system.
 */
export function PearlLiquidBackground({
  intensity = 1.15,
  /** 0..1 — how much the centre column is kept free of strong highlights. */
  calm = 0.7,
  opacity = 1,
  className = "",
}: {
  intensity?: number;
  calm?: number;
  opacity?: number;
  className?: string;
}) {
  const pathname = usePathname();
  const variant = pearlVariantForRoute(pathname);

  return (
    <div className={`fixed inset-0 ${className}`} style={{ zIndex: -1 }} aria-hidden>
      <PearlSurface
        // Remounting per route restarts the composition cleanly instead of
        // morphing between two seeds mid-navigation.
        key={pathname ?? "/"}
        mode="background"
        seed={variant.seed}
        tint={variant.tint}
        intensity={intensity}
        calm={calm}
        opacity={opacity}
      />
      {/* Readability veil: a soft white column behind the content measure, with
          the edges left clear so the larger forms stay visible. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.24) 28%, rgba(255,255,255,.28) 72%, rgba(255,255,255,0) 100%)",
        }}
      />
    </div>
  );
}
