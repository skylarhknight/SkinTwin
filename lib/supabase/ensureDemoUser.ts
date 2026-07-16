import { DEMO_USER_ID } from "@/lib/demoUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const DEMO_SEED_EMAIL = "demo@skintwin.local";
const DEMO_SEED_NAME = "Demo User";

/**
 * Ensures the demo user row exists for FK-safe inserts. Server-only.
 */
export async function ensureDemoUser(): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from("users").upsert(
      {
        id: DEMO_USER_ID,
        email: DEMO_SEED_EMAIL,
        full_name: DEMO_SEED_NAME,
      },
      { onConflict: "id" }
    );
    if (error) {
      console.warn("[ensureDemoUser] upsert failed:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[ensureDemoUser] unexpected error:", e);
    return false;
  }
}
