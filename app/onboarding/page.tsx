"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { getAccessToken } from "@/lib/auth/authClient";
import type { Product, UserProfile } from "@/lib/types";
import { LS_KEYS } from "@/lib/storage/localStorageKeys";

const goals = ["reduce_acne", "improve_hydration", "reduce_redness", "fade_dark_spots", "improve_texture", "prevent_aging", "reduce_dark_circles", "build_consistency"];
const emptyProduct = (): Product => ({ id: `product-${Date.now()}`, name: "", brand: "", category: "serum", activeIngredients: [], usageTime: "AM", frequency: "daily", dateStarted: new Date().toISOString().slice(0, 10) });

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>({ skinType: "combination", sensitivityLevel: "medium", routineExperience: "beginner", budgetLevel: "$$", primaryGoals: [] });
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<Product>(emptyProduct());
  const save = async () => {
    localStorage.setItem(LS_KEYS.profile, JSON.stringify(profile));
    localStorage.setItem(LS_KEYS.products, JSON.stringify(products));
    const token = await getAccessToken();
    if (!token) return;
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(profile),
    });
    for (const p of products) {
      await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(p),
      });
    }
  };
  const addProduct = () => { if (!draft.name.trim()) return; setProducts([...products, { ...draft, activeIngredients: String(draft.activeIngredients).split(",").map((x) => x.trim()).filter(Boolean) }]); setDraft(emptyProduct()); };
  return <div className="mx-auto max-w-3xl space-y-8"><PageHeader eyebrow={`Step ${step + 1} of 4`} title={<>Set up your skin <span className="italic">profile</span></>} intro="A few quick choices so your first scan lands with context." />
    {step === 0 && <section className="card"><h2 className="font-semibold">What are your main goals?</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{goals.map((g) => <button key={g} onClick={() => setProfile({ ...profile, primaryGoals: profile.primaryGoals.includes(g) ? profile.primaryGoals.filter((x) => x !== g) : [...profile.primaryGoals, g] })} className={`rounded-2xl border p-4 text-left text-sm ${profile.primaryGoals.includes(g) ? "border-sf-blue-deep bg-sf-blue-soft ring-2 ring-sf-blue-lighter/40" : "border-sf-blue-lighter/60 bg-white"}`}>{g.replaceAll("_", " ")}</button>)}</div></section>}
    {step === 1 && <section className="card grid gap-4"><Select label="Skin type" value={profile.skinType} values={["dry","oily","combination","normal","unsure"]} onChange={(v) => setProfile({ ...profile, skinType: v as UserProfile["skinType"] })}/><Select label="Sensitivity" value={profile.sensitivityLevel} values={["low","medium","high"]} onChange={(v) => setProfile({ ...profile, sensitivityLevel: v as UserProfile["sensitivityLevel"] })}/><Select label="Experience" value={profile.routineExperience} values={["beginner","intermediate","advanced"]} onChange={(v) => setProfile({ ...profile, routineExperience: v as UserProfile["routineExperience"] })}/><Select label="Budget" value={profile.budgetLevel} values={["$","$$","$$$"]} onChange={(v) => setProfile({ ...profile, budgetLevel: v as UserProfile["budgetLevel"] })}/></section>}
    {step === 2 && <section className="card space-y-4"><h2 className="font-semibold">Add current products</h2><input className="input" placeholder="Product name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}/><input className="input" placeholder="Brand" value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })}/><input className="input" placeholder="Category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}/><input className="input" placeholder="Active ingredients, comma-separated" onChange={(e) => setDraft({ ...draft, activeIngredients: e.target.value.split(",") })}/><button className="btn-secondary" onClick={addProduct}>Add Product</button><div className="space-y-2">{products.map((p) => <div className="rounded-2xl bg-sf-blue-soft p-3 text-sm" key={p.id}>{p.name} · {p.category}</div>)}</div></section>}
    {step === 3 && <section className="card text-center"><h2 className="text-2xl font-semibold">Ready for your baseline scan</h2><p className="mt-2 text-sf-muted">Your scan will create the first SkinTwin score and routine recommendation.</p><Link href="/scan" onClick={() => { void save(); }} className="btn-primary mt-6">Go to Scan</Link></section>}
    <div className="flex justify-between"><button className="btn-secondary" onClick={() => setStep(Math.max(0, step - 1))}>Back</button>{step < 3 && <button className="btn-primary" onClick={() => { void save(); setStep(step + 1); }}>Continue</button>}</div></div>;
}
function Select({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (v: string) => void }) { return <label className="grid gap-2"><span className="label">{label}</span><select className="input" value={value} onChange={(e) => onChange(e.target.value)}>{values.map((v) => <option key={v}>{v}</option>)}</select></label>; }
