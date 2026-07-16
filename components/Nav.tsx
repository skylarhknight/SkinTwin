"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser, signOut, type SkinTwinUser } from "@/lib/auth/authClient";

const primary = [
  ["Dashboard", "/dashboard"],
  ["Scan", "/scan"],
  ["Trends", "/trends"],
  ["Routine", "/routine"],
  ["Future", "/future"],
  ["Shop", "/recommendations"],
];
const secondary = [["Products", "/products"], ["Insights", "/insights"], ["Settings", "/settings"]];
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/scan",
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
    <header className="sticky top-0 z-20 backdrop-blur-sm">
      <div className="mx-auto mt-3 flex max-w-6xl items-center justify-between gap-4 rounded-card border border-[#e7ecf6] bg-sf-surface/95 px-4 py-3 shadow-sf-sm">
        <Link href="/" className="font-semibold tracking-tight text-sf-ink">
          SkinTwin
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          {[...primary, ...secondary].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-full border border-transparent bg-white px-3 py-1.5 text-sm text-sf-muted shadow-sm transition-colors hover:border-[#d9e4f3] hover:bg-sf-blue-soft hover:text-sf-ink"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {!authResolved && onProtectedRoute ? (
            <span className="rounded-full border border-[#d7e2f3] bg-sf-blue-soft px-4 py-2 text-sm font-semibold text-sf-ink">
              Logged in
            </span>
          ) : user || onProtectedRoute ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d7e2f3] bg-sf-blue-soft px-3 py-1.5 text-sm text-sf-ink">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Logged in
              </span>
              {user?.email ? <span className="max-w-[160px] truncate text-sm text-sf-muted">{user.email}</span> : null}
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-[#d7e2f3] bg-white px-4 py-2 text-sm font-medium text-sf-ink shadow-sm hover:bg-sf-blue-soft"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-[#d7e2f3] bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-sf-blue-soft"
              >
                Log in
              </Link>
              <Link href="/onboarding" className="rounded-full bg-sf-blue px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sf-blue-deep">
                Start
              </Link>
            </>
          )}
        </div>
      </div>
      <nav className="mx-auto mt-2 flex max-w-6xl gap-2 overflow-x-auto px-2 pb-3 md:hidden">
        {primary.map(([label, href]) => (
          <Link key={href} href={href} className="shrink-0 rounded-full border border-[#dce6f5] bg-white px-3 py-2 text-sm shadow-sf-sm">
            {label}
          </Link>
        ))}
        {user || onProtectedRoute ? (
          <Link href="/settings" className="shrink-0 rounded-full bg-sf-blue px-3 py-2 text-sm font-medium text-white shadow-sf-sm">
            Account
          </Link>
        ) : (
          <Link href="/login" className="shrink-0 rounded-full bg-sf-blue px-3 py-2 text-sm font-medium text-white shadow-sf-sm">
            Login
          </Link>
        )}
      </nav>
    </header>
  );
}
