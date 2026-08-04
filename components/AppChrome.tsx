"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { Nav } from "@/components/Nav";
import { MotionLayer } from "@/components/MotionLayer";
import { SiteFooter } from "@/components/SiteFooter";
import { PearlLiquidBackground } from "@/components/pearl";

/** Routes that render full-bleed, without the SkinTwin nav / ambient / shell chrome. */
const BARE_PREFIXES = ["/archive"];
/** Exact routes that render full-bleed (prefix match would over-capture, e.g. "/"). */
const BARE_EXACT = ["/", "/login"];

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bare =
    BARE_EXACT.includes(pathname ?? "") ||
    BARE_PREFIXES.some((p) => pathname === p || pathname?.startsWith(`${p}/`));

  if (bare) return <>{children}</>;

  return (
    <>
      {/* Interior routes live inside the pearl liquid-glass environment. */}
      <PearlLiquidBackground />
      <AuthGate>
        <MotionLayer />
        <div className="flex min-h-screen flex-col">
          <Nav />
          <main className="page-shell mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <SiteFooter />
        </div>
      </AuthGate>
    </>
  );
}
