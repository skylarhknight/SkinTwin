import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/serverAuth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureAppUser } from "@/lib/supabase/ensureAppUser";
import type { Product } from "@/lib/types";

function mapProductRow(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    brand: row.brand == null ? undefined : String(row.brand),
    category: String(row.category ?? "serum"),
    activeIngredients: Array.isArray(row.active_ingredients) ? row.active_ingredients.map((x) => String(x)) : [],
    usageTime: (String(row.usage_time ?? "AM") as Product["usageTime"]) || "AM",
    frequency: String(row.frequency ?? "daily"),
    dateStarted: String(row.date_started ?? new Date().toISOString().slice(0, 10)),
    dateStopped: row.date_stopped == null ? undefined : String(row.date_stopped),
    notes: row.notes == null ? undefined : String(row.notes),
  };
}

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: (data ?? []).map((r) => mapProductRow(r as Record<string, unknown>)) });
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  const ensured = await ensureAppUser(supabase, user);
  if (!ensured) return NextResponse.json({ error: "Could not prepare user record." }, { status: 500 });
  const product = (await request.json().catch(() => ({}))) as Partial<Product>;
  if (!product.name || !product.category) return NextResponse.json({ error: "name and category are required" }, { status: 400 });

  const { data, error } = await supabase
    .from("products")
    .insert({
      user_id: userId,
      name: product.name,
      brand: product.brand ?? null,
      category: product.category,
      active_ingredients: product.activeIngredients ?? [],
      usage_time: product.usageTime ?? "AM",
      frequency: product.frequency ?? "daily",
      date_started: product.dateStarted ?? new Date().toISOString().slice(0, 10),
      date_stopped: product.dateStopped ?? null,
      notes: product.notes ?? null,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: mapProductRow(data as Record<string, unknown>), status: "created" });
}
