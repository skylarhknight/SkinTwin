"use client";
import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/auth/authClient";
import { LS_KEYS } from "@/lib/storage/localStorageKeys";
import type { Product, SkinScan } from "@/lib/types";

const blank = (): Product => ({ id: `product-${Date.now()}`, name: "", brand: "", category: "serum", activeIngredients: [], usageTime: "AM", frequency: "daily", dateStarted: new Date().toISOString().slice(0,10) });
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [draft, setDraft] = useState<Product>(blank());
  const [scan, setScan] = useState<SkinScan | null>(null);
  useEffect(() => {
    const s = localStorage.getItem(LS_KEYS.latestScan);
    if (s) setScan(JSON.parse(s));
    getAccessToken()
      .then((token) => {
        if (!token) throw new Error("missing token");
        return fetch("/api/products", { headers: { Authorization: `Bearer ${token}` } });
      })
      .then((r) => r.json())
      .then((data) => {
        const next = (data as { products?: Product[] }).products ?? [];
        setProducts(next);
        localStorage.setItem(LS_KEYS.products, JSON.stringify(next));
      })
      .catch(() => {
        setProducts(JSON.parse(localStorage.getItem(LS_KEYS.products) || "[]"));
      });
  }, []);
  const persist = (next: Product[]) => { setProducts(next); localStorage.setItem(LS_KEYS.products, JSON.stringify(next)); };
  const add = async () => {
    if (!draft.name) return;
    const payload = { ...draft, activeIngredients: String(draft.activeIngredients).split(",").map((x) => x.trim()).filter(Boolean) };
    const token = await getAccessToken();
    if (!token) return;
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    const created = (data as { product?: Product }).product ?? payload;
    persist([...products, created]);
    setDraft(blank());
  };
  const remove = async (id: string) => {
    const token = await getAccessToken();
    if (token) await fetch(`/api/products/${encodeURIComponent(id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    persist(products.filter((p) => p.id !== id));
  };
  return <div className="space-y-6"><h1 className="text-3xl font-semibold">Product Shelf</h1><section className="card grid gap-3 md:grid-cols-2"><input className="input" placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}/><input className="input" placeholder="Brand" value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })}/><input className="input" placeholder="Category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}/><input className="input" placeholder="Ingredients comma-separated" onChange={(e) => setDraft({ ...draft, activeIngredients: e.target.value.split(",") })}/><button className="btn-primary md:col-span-2" onClick={add}>Add Product</button></section><section className="grid gap-4 md:grid-cols-2">{products.length ? products.map((p) => <div className="card" key={p.id}><div className="flex justify-between gap-4"><div><h2 className="font-semibold">{p.name}</h2><p className="text-sm text-sf-muted">{p.brand} · {p.category}</p></div><button className="text-sm text-red-700" onClick={() => remove(p.id)}>Delete</button></div><div className="mt-4 flex flex-wrap gap-2">{labels(p, scan).map((l) => <span className="badge" key={l}>{l}</span>)}</div></div>) : <p className="text-sf-muted">No products yet.</p>}</section></div>;
}
function labels(p: Product, scan: SkinScan | null) { const out: string[] = []; const age = (Date.now() - new Date(p.dateStarted).getTime()) / 86400000; const ing = p.activeIngredients.join(" ").toLowerCase(); const cat = p.category.toLowerCase(); if (age <= 14) out.push("New product"); if ((cat.includes("exfoliant") || cat.includes("retinoid") || /aha|bha|retinol/.test(ing)) && (scan?.metrics.redness ?? 70) < 75) out.push("Possible trigger"); if (/vitamin_c|niacinamide|azelaic_acid/.test(ing)) out.push("Supports pigmentation"); return out.length ? out : ["Tracked"]; }
