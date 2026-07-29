import { createClient } from "@supabase/supabase-js";

/**
 * Server-only secret key. Supabase renamed "service_role" to "secret"; accept both.
 */
export function getSupabaseSecretKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

/**
 * Service-role Supabase client for server/API routes only.
 * Never import this module from client components.
 */
export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabaseSecretKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
