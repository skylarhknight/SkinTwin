import { createClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey } from "@/lib/supabase/admin";

export function hasSupabaseServerConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabaseSecretKey());
}

export function getSupabaseServerClient() {
  if (!hasSupabaseServerConfig()) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, getSupabaseSecretKey());
}
