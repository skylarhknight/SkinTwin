"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { LS_KEYS } from "@/lib/storage/localStorageKeys";

export type SkinTwinUser = {
  id: string;
  email: string;
  fullName?: string;
  provider: "supabase";
};

/** @deprecated Use SkinTwinUser. Kept temporarily during the rename. */
export type SkinForwardUser = SkinTwinUser;

export async function getCurrentUser(): Promise<SkinTwinUser | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (data.user?.email) {
    return {
      id: data.user.id,
      email: data.user.email,
      fullName: String(data.user.user_metadata?.full_name ?? ""),
      provider: "supabase",
    };
  }
  return null;
}

export async function signIn(email: string, password: string): Promise<SkinTwinUser> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase Auth is not configured.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user?.email) throw new Error("No user returned from Supabase.");
  return {
    id: data.user.id,
    email: data.user.email,
    fullName: String(data.user.user_metadata?.full_name ?? ""),
    provider: "supabase",
  };
}

export async function signUp(email: string, password: string, fullName?: string): Promise<SkinTwinUser> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase Auth is not configured.");
  const { data, error } = await supabase.auth.signUp({
    password,
    email,
    options: { data: { full_name: fullName ?? "" } },
  });
  if (error) throw new Error(error.message);
  if (!data.user?.email) throw new Error("Check your email to confirm your account, then sign in.");
  return { id: data.user.id, email: data.user.email, fullName, provider: "supabase" };
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    Object.values(LS_KEYS).forEach((k) => localStorage.removeItem(k));
  }
}

export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}
