"use client";

import Link from "next/link";
import { PearlLiquidFooter } from "@/components/pearl";

const FOOTER_LINKS: [string, string][] = [
  ["Dashboard", "/dashboard"],
  ["Scan", "/scan"],
  ["Trends", "/trends"],
  ["Routine", "/routine"],
  ["Future", "/future"],
  ["Shop", "/recommendations"],
];

/**
 * The one footer used on every page, home included. Content only — the pearl
 * serum treatment lives in `PearlLiquidFooter`.
 */
export function SiteFooter() {
  return (
    <PearlLiquidFooter>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16 md:flex-row md:items-end md:justify-between md:px-8 md:py-20">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-[0.85rem] border border-white/60 bg-grad-aurora shadow-sf-sm">
              <span className="absolute -bottom-3 -right-2 h-7 w-7 rounded-full bg-sf-plum/70" />
              <span className="relative font-display text-base font-semibold text-white">S</span>
            </span>
            <span className="font-display text-lg font-medium tracking-tight">
              SkinTwin<span className="text-sf-rose">.</span>
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-6 text-sf-muted">
            AI skincare tracking, habit insights, and future-aging simulation. Private by design · Never medical advice.
          </p>
        </div>
        <nav
          className="flex flex-wrap gap-x-8 gap-y-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-sf-muted"
          aria-label="Footer navigation"
        >
          {FOOTER_LINKS.map(([label, href]) => (
            <Link key={href} href={href} className="transition-colors hover:text-sf-ink">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="border-t border-white/50 px-5 py-5 text-center text-[10px] uppercase tracking-[0.24em] text-sf-muted md:px-8">
        © {new Date().getFullYear()} SkinTwin — Soft intelligence for your skin
      </p>
    </PearlLiquidFooter>
  );
}
