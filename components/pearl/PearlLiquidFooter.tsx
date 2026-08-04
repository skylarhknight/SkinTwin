"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PearlSurface } from "./PearlSurface";
import { pearlVariantForRoute } from "./pearlRoute";

/**
 * Footer shell filled with a stronger, more sculptural version of the material —
 * the page descending into a pool of pearl serum.
 *
 * The footer variant of the shader adds a large form rising out of the bottom
 * edge and fades itself in across the top band, which is what produces the
 * transition from the page above rather than a hard seam.
 *
 * Content is passed as children and rendered above the surface untouched; the
 * canvas never sits over the footer UI.
 */
export function PearlLiquidFooter({
  children,
  intensity = 1.12,
  className = "",
}: {
  children: ReactNode;
  intensity?: number;
  className?: string;
}) {
  const pathname = usePathname();
  // Offset the route seed so a page's footer never mirrors its own background.
  const base = pearlVariantForRoute(pathname);
  const seed: [number, number, number] = [
    (base.seed[0] + 0.37) % 1,
    (base.seed[1] + 0.61) % 1,
    (base.seed[2] + 0.19) % 1,
  ];

  return (
    <footer className={`relative isolate overflow-hidden border-t border-white/60 ${className}`}>
      <PearlSurface
        key={pathname ?? "/"}
        mode="footer"
        seed={seed}
        tint={base.tint}
        intensity={intensity}
        // The footer is a contained region, so the calm centre column matters
        // less here — the forms are allowed to be more expressive.
        calm={0.35}
      />
      {/* Light lift under the text block only; the pearl stays visible. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(255,255,255,.34) 0%, rgba(255,255,255,.12) 42%, rgba(255,255,255,0) 100%)",
        }}
        aria-hidden
      />
      <div className="relative">{children}</div>
    </footer>
  );
}
