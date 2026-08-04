"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser, signOut, type SkinTwinUser } from "@/lib/auth/authClient";

const primary = [
  ["Dashboard", "/dashboard"],
  ["Scan", "/scan"],
  ["Progress", "/progress"],
  ["Trends", "/trends"],
  ["Routine", "/routine"],
  ["Future", "/future"],
  ["Shop", "/recommendations"],
];
const secondary = [["Products", "/products"], ["Insights", "/insights"], ["Settings", "/settings"]];
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/scan",
  "/progress",
  "/trends",
  "/routine",
  "/future",
  "/products",
  "/insights",
  "/settings",
  "/habits",
  "/onboarding",
  "/recommendations",
];

export function Nav() {
  const pathname = usePathname();
  const [user, setUser] = useState<SkinTwinUser | null>(null);
  const [authResolved, setAuthResolved] = useState(false);

  const onProtectedRoute = PROTECTED_PREFIXES.some((p) => pathname === p || pathname?.startsWith(`${p}/`));

  useEffect(() => {
    getCurrentUser()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setAuthResolved(true));
  }, []);

  async function handleSignOut() {
    await signOut();
    setUser(null);
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-40 px-3 pt-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-[1.4rem] border border-white/60 bg-sf-surface/85 px-3 py-2.5 shadow-[0_18px_40px_-24px_rgba(74,54,66,.4)] backdrop-blur-xl">
        <Link href="/" className="group flex items-center gap-2.5 text-sf-ink" aria-label="SkinTwin home">
          <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-[0.85rem] border border-white/60 bg-grad-aurora shadow-sf-sm transition-transform group-hover:rotate-3">
            <span className="absolute -bottom-3 -right-2 h-7 w-7 rounded-full bg-sf-plum/70" />
            <span className="relative font-display text-base font-semibold text-white">S</span>
          </span>
          <span className="font-display text-[1.05rem] font-semibold tracking-[-0.02em]">SkinTwin<span className="text-sf-rose">.</span></span>
        </Link>
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary navigation">
          {[...primary, ...secondary].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href || pathname?.startsWith(`${href}/`) ? "page" : undefined}
              className={`relative rounded-full px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                pathname === href || pathname?.startsWith(`${href}/`)
                  ? "bg-sf-champagne-soft text-sf-ink"
                  : "text-sf-muted hover:bg-sf-plum-soft hover:text-sf-ink"
              }`}
            >
              {label}
              {pathname === href || pathname?.startsWith(`${href}/`) ? (
                <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-sf-rose" />
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          {!authResolved && onProtectedRoute ? (
            <span className="rounded-lg border border-sf-ink/30 bg-sf-blue-pale px-3 py-2 text-xs font-semibold text-sf-ink">
              Account
            </span>
          ) : user || onProtectedRoute ? (
            <>
              <span className="hidden items-center gap-2 rounded-lg border border-sf-ink/30 bg-sf-blue-pale px-3 py-2 text-xs text-sf-ink md:inline-flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Online
              </span>
              {user?.email ? <span className="hidden max-w-[120px] truncate text-xs text-sf-muted xl:inline">{user.email}</span> : null}
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-sf-line bg-sf-surface px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sf-ink shadow-[0_5px_14px_-9px_rgba(74,54,66,.45)] transition-transform hover:-translate-y-0.5"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-xs font-semibold hover:bg-sf-blue-pale"
              >
                Log in
              </Link>
              <Link href="/login?next=/onboarding" className="rounded-full border border-white/40 bg-grad-cta px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_22px_-12px_rgba(110,85,112,.7)] transition-transform hover:-translate-y-0.5">
                Start scan ↗
              </Link>
            </>
          )}
        </div>
      </div>
      <nav className="mx-auto mt-2 flex max-w-6xl gap-1.5 overflow-x-auto px-1 pb-3 lg:hidden" aria-label="Mobile navigation">
        {primary.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={`shrink-0 rounded-xl border border-sf-line px-3 py-1.5 text-xs font-semibold shadow-[0_5px_14px_-10px_rgba(74,54,66,.3)] ${pathname === href ? "bg-sf-yellow" : "bg-sf-surface"}`}
          >
            {label}
          </Link>
        ))}
        {user || onProtectedRoute ? (
          <Link href="/settings" className="shrink-0 rounded-xl border border-white/40 bg-grad-cta px-3 py-1.5 text-xs font-semibold text-white shadow-[0_5px_14px_-9px_rgba(110,85,112,.5)]">
            Account
          </Link>
        ) : (
          <Link href="/login" className="shrink-0 rounded-xl border border-white/40 bg-grad-cta px-3 py-1.5 text-xs font-semibold text-white shadow-[0_5px_14px_-9px_rgba(110,85,112,.5)]">
            Login
          </Link>
        )}
      </nav>
    </header>
  );
}
