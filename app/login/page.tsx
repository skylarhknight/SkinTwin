"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FluidCanvas } from "@/components/FluidCanvas";
import { PearlCanvas } from "@/components/PearlCanvas";
import { signIn, signUp } from "@/lib/auth/authClient";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("demo@skintwin.app");
  const [password, setPassword] = useState("password123");
  const [fullName, setFullName] = useState("Demo User");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signin") await signIn(email, password);
      else await signUp(email, password, fullName);
      const next =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      router.push(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <PearlCanvas className="fixed inset-0 -z-10" intensity={1.1} />
    <div className="mx-auto grid max-w-5xl gap-8 py-8 md:grid-cols-[.9fr_1.1fr]">
      <section className="relative overflow-hidden rounded-card border border-white/50 p-8 text-white shadow-sf md:p-10">
        <FluidCanvas className="absolute inset-0" palette="plum" intensity={1.2} />
        <div className="absolute inset-0 bg-gradient-to-br from-sf-plum/90 via-[#6e5570]/84 to-[#a06a7e]/78" aria-hidden />
        <div className="relative">
          <span className="inline-flex rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[.16em] backdrop-blur">
            SkinTwin account
          </span>
          <h1 className="mt-5 font-display text-4xl font-medium tracking-tight">Save your scans, habits, products, and routines.</h1>
          <p className="mt-4 leading-7 text-white/85">
            Sign in to keep your skincare timeline tied to your account. Protected features are only available to authenticated users.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-white/85">
            <p>• Persistent user profile</p>
            <p>• Saved scan history and progress</p>
            <p>• Product shelf and habit tracking</p>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="flex rounded-full bg-sf-blue-soft p-1 text-sm font-medium">
          <button className={`flex-1 rounded-full px-4 py-2 ${mode === "signin" ? "bg-white shadow-sm" : "text-sf-muted"}`} onClick={() => setMode("signin")}>Sign in</button>
          <button className={`flex-1 rounded-full px-4 py-2 ${mode === "signup" ? "bg-white shadow-sm" : "text-sf-muted"}`} onClick={() => setMode("signup")}>Create account</button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <label className="block text-sm font-medium">Name
              <input className="input mt-2" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
            </label>
          )}
          <label className="block text-sm font-medium">Email
            <input className="input mt-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block text-sm font-medium">Password
            <input className="input mt-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </label>
          {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>{loading ? "Saving..." : mode === "signin" ? "Sign in" : "Create account"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-sf-muted"><Link href="/" className="underline">Back to home</Link></p>
      </section>
    </div>
    </>
  );
}
