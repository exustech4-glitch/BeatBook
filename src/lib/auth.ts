import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type AppRole = "ARTIST" | "CLIENT";
export type AppProfile = { id: string; email: string; display_name: string; role: AppRole };

export async function getCurrentProfile(): Promise<AppProfile | null> {
  if (!getSupabaseEnv()) return null;
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (claimsError || !claims?.sub) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", claims.sub)
    .maybeSingle();
  if (error || !profile) return null;
  return profile as AppProfile;
}

export async function requireRole(role: AppRole) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/sign-in");
  if (profile.role !== role) redirect(profile.role === "ARTIST" ? "/dashboard" : "/book");
  return profile;
}
