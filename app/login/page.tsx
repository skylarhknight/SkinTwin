"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="mx-auto grid max-w-5xl gap-8 py-8 md:grid-cols-[.9fr_1.1fr]">
      <section className="rounded-card border border-white/20 bg-sf-blue p-8 text-white shadow-sf md:p-10">
        <span className="inline-flex rounded-full bg-sf-yellow/90 px-3 py-1 text-xs font-semibold text-sf-ink shadow-sm">
          SkinTwin account
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">Save your scans, habits, products, and routines.</h1>
        <p className="mt-4 leading-7 text-white/90">
          Sign in to keep your skincare timeline tied to your account. Protected features are only available to authenticated users.
        </p>
        <div className="mt-8 grid gap-3 text-sm text-white/90">
          <p>• Persistent user profile</p>
          <p>• Saved scan history and progress</p>
          <p>• Product shelf and habit tracking</p>
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
  );
}
