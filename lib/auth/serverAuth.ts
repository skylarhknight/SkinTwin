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

export async function getRequestUser(request: Request): Promise<RequestUser | null> {
  const token = readBearerToken(request);
  if (!token) return null;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id || !data.user.email) return null;
  return {
    id: data.user.id,
    email: data.user.email,
    fullName: String(data.user.user_metadata?.full_name ?? ""),
  };
}
