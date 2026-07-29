import { createClient } from "@supabase/supabase-js";

/**
 * Supabase renamed the browser key from "anon" to "publishable". Both names are
 * read literally so Next.js can inline them at build time.
 */
function getPublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}

export function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getPublishableKey());
}

export function getSupabaseBrowserClient() {
  if (!hasSupabaseConfig()) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, getPublishableKey());
}
