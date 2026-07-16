"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/authClient";

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

const PUBLIC_PREFIXES = ["/", "/login"];

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  const needsAuth = useMemo(() => {
    if (!pathname) return false;
    if (PUBLIC_PREFIXES.includes(pathname)) return false;
    return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }, [pathname]);

  useEffect(() => {
    if (!needsAuth) {
      setChecked(true);
      return;
    }
    getCurrentUser()
      .then((u) => {
        if (!u) {
          const next = encodeURIComponent(pathname || "/dashboard");
          router.replace(`/login?next=${next}`);
          return;
        }
        setChecked(true);
      })
      .catch(() => {
        const next = encodeURIComponent(pathname || "/dashboard");
        router.replace(`/login?next=${next}`);
      });
  }, [needsAuth, pathname, router]);

  if (!needsAuth) return <>{children}</>;
  if (!checked) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
        <section className="card">
          <p className="text-sm text-sf-muted">Checking session...</p>
        </section>
      </main>
    );
  }
  return <>{children}</>;
}
