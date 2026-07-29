"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { Nav } from "@/components/Nav";
import { MotionLayer } from "@/components/MotionLayer";
import { AuroraCanvas } from "@/components/AuroraCanvas";

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
      <AuroraCanvas className="fixed inset-0 -z-10 opacity-50" intensity={1.35} />
      <AuthGate>
        <MotionLayer />
        <Nav />
        <main className="page-shell mx-auto min-h-screen max-w-6xl px-4 py-8">{children}</main>
      </AuthGate>
    </>
  );
}
