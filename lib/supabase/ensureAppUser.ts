import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestUser } from "@/lib/auth/serverAuth";

/**
 * Ensures a row exists in public.users for foreign-key relationships.
 * Auth user exists in auth.users; this mirrors minimal identity into app table.
 */
export async function ensureAppUser(
  supabase: SupabaseClient,
  user: RequestUser
): Promise<boolean> {
  try {
    const { error } = await supabase.from("users").upsert(
      {
        id: user.id,
        email: user.email,
        full_name: user.fullName ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    return !error;
  } catch {
    return false;
  }
}
