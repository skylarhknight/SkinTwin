"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/auth/authClient";
import { LS_KEYS } from "@/lib/storage/localStorageKeys";

type Variant = "primary" | "secondary" | "ghost";

const STYLES: Record<Variant, string> = {
  primary:
    "inline-flex items-center gap-2 rounded-full border border-white/40 bg-grad-cta px-5 py-2.5 text-sm font-semibold text-white shadow-sf-sm transition-transform hover:-translate-y-0.5 disabled:opacity-60",
  secondary:
    "inline-flex items-center gap-2 rounded-full border border-sf-line bg-sf-surface px-5 py-2.5 text-sm font-semibold text-sf-ink shadow-sm transition-colors hover:bg-sf-plum-soft disabled:opacity-60",
  ghost:
    "inline-flex items-center gap-2 text-sm font-medium text-sf-blue-deep underline-offset-2 hover:underline disabled:opacity-60",
};

/**
 * Seeds the current user's account with realistic demo data via /api/demo/seed.
 * Used to make the app fully alive in one click for hackathon judges.
 */
export function DemoSeedButton({
  label = "Try with demo data",
  variant = "secondary",
  redirectTo = "/dashboard",
  className = "",
}: {
  label?: string;
  variant?: Variant;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onClick = async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Please sign in to seed demo data.");
      const res = await fetch("/api/demo/seed", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Seeding failed (${res.status})`);
      }
      try {
        Object.values(LS_KEYS).forEach((k) => {
          if (k !== LS_KEYS.authUser) localStorage.removeItem(k);
        });
      } catch {
        /* ignore */
      }
      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seeding failed");
      setLoading(false);
    }
  };

  return (
    <div className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <button type="button" onClick={onClick} disabled={loading} className={STYLES[variant]}>
        {loading ? (
          <>
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Seeding…
          </>
        ) : (
          <>
            <span aria-hidden>✨</span>
            {label}
          </>
        )}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
