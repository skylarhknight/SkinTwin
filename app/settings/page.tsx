"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Disclaimer } from "@/components/Disclaimer";
import { DemoSeedButton } from "@/components/DemoSeedButton";
import { getAccessToken, getCurrentUser, signOut, type SkinTwinUser } from "@/lib/auth/authClient";
import { LS_KEYS } from "@/lib/storage/localStorageKeys";

export default function SettingsPage() {
  const [user, setUser] = useState<SkinTwinUser | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearMsg, setClearMsg] = useState("");

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  const reset = () => {
    Object.values(LS_KEYS).forEach((k) => {
      if (k !== LS_KEYS.authUser) localStorage.removeItem(k);
    });
    alert("Local skincare data cleared. Account session kept.");
  };

  const clearAccount = async () => {
    if (!confirm("This will delete your scans, habits, products, and profile from the server. Continue?")) return;
    setClearing(true);
    setClearMsg("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Please sign in again to clear data.");
      const res = await fetch("/api/demo/seed", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to clear");
      }
      Object.values(LS_KEYS).forEach((k) => {
        if (k !== LS_KEYS.authUser) localStorage.removeItem(k);
      });
      setClearMsg("Cleared. You can take a new scan or seed demo data again.");
    } catch (e) {
      setClearMsg(e instanceof Error ? e.message : "Failed to clear");
    } finally {
      setClearing(false);
    }
  };

  const logout = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold">Settings</h1>

      <section className="card">
        <p className="font-medium">Account</p>
        {user ? (
          <div className="mt-2 space-y-3 text-sm text-sf-muted">
            <p>{user.email}</p>
            <p>Provider: Supabase Auth</p>
            <button className="btn-secondary" onClick={logout}>
              Sign out
            </button>
          </div>
        ) : (
          <div className="mt-2 space-y-3 text-sm text-sf-muted">
            <p>You are not logged in. Create an account to keep your timeline attached to a user session.</p>
            <Link href="/login" className="btn-primary">
              Log in
            </Link>
          </div>
        )}
      </section>

      <section className="card">
        <p className="font-medium">Demo data</p>
        <p className="mt-2 text-sm text-sf-muted">
          Seed your account with two weeks of realistic scans, habits, products, and a profile so you can explore the
          full app without taking a selfie. Re-seeding replaces any prior demo data; clearing wipes server data tied to
          this account.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <DemoSeedButton label="Seed demo data" variant="primary" />
          <button className="btn-secondary" onClick={clearAccount} disabled={clearing}>
            {clearing ? "Clearing…" : "Clear my account data"}
          </button>
        </div>
        {clearMsg ? <p className="mt-3 text-xs text-sf-muted">{clearMsg}</p> : null}
      </section>

      <section className="card">
        <p className="font-medium">Local device data</p>
        <p className="mt-2 text-sm text-sf-muted">
          Clear cached local data from this browser while keeping your signed-in account session.
        </p>
        <button className="btn-secondary mt-5" onClick={reset}>
          Delete local skincare data
        </button>
      </section>

      <Disclaimer />
    </div>
  );
}
