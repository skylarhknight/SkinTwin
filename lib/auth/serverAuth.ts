import { DEMO_EMAIL, DEMO_USER_ID } from "@/lib/demoUser";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function readBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  return m?.[1]?.trim() || null;
}

export async function getRequestUserId(request: Request): Promise<string | null> {
  const user = await getRequestUser(request);
  return user?.id ?? null;
}

export type RequestUser = {
  id: string;
  email: string;
  fullName?: string;
};

export const DEMO_REQUEST_USER: RequestUser = {
  id: DEMO_USER_ID,
  email: DEMO_EMAIL,
  fullName: "Demo User",
};

export async function getRequestUser(request: Request): Promise<RequestUser | null> {
  const supabase = getSupabaseAdminClient();
  /**
   * No Supabase means no auth backend and no real user data to protect, and
   * CONTRACT §7/§17 require the app to stay usable on demo data instead of
   * erroring out. Identify every caller as the demo user in that case only —
   * once Supabase is configured, the bearer token is required as before.
   */
  if (!supabase) return DEMO_REQUEST_USER;

  const token = readBearerToken(request);
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id || !data.user.email) return null;
  return {
    id: data.user.id,
    email: data.user.email,
    fullName: String(data.user.user_metadata?.full_name ?? ""),
  };
}
