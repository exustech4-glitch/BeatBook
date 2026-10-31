"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; success?: string };

function safeNextPath(value: FormDataEntryValue | null, fallback = "/book") {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function signIn(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const nextPath = safeNextPath(formData.get("next"));
  if (!email || !password) return { error: "Enter your email and password." };

  let supabase;
  try { supabase = await createClient(); }
  catch { return { error: "Authentication is not configured yet. Add the Supabase values from .env.example." }; }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "We couldn’t sign you in with those details." };

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const { data: profile } = claims?.sub
    ? await supabase.from("profiles").select("role").eq("id", claims.sub).maybeSingle()
    : { data: null };
  if (profile?.role === "ARTIST") {
    const { data: artist } = await supabase.from("artist_profiles").select("user_id").eq("user_id", claims!.sub).maybeSingle();
    redirect(artist ? "/dashboard" : "/onboarding");
  }
  redirect(nextPath);
}

export async function signUp(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const displayName = String(formData.get("display_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("account_role") || "CLIENT");
  const nextPath = safeNextPath(formData.get("next"));
  if (displayName.length < 2) return { error: "Enter your name so the artist knows who’s booking." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Choose a password with at least 8 characters." };
  if (role !== "CLIENT" && role !== "ARTIST") return { error: "Choose client or artist account." };

  let supabase;
  try { supabase = await createClient(); }
  catch { return { error: "Authentication is not configured yet. Add the Supabase values from .env.example." }; }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, account_role: role },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(role === "ARTIST" ? "/onboarding" : nextPath)}`,
    },
  });
  if (error) return { error: error.message.includes("already registered") ? "That email already has an account. Try signing in." : "We couldn’t create your account. Check your details and try again." };
  return { success: "Check your inbox for a verification link. You’ll be able to sign in after you confirm your email." };
}

export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } finally {
    redirect("/sign-in");
  }
}

export async function signOutForBooking(formData: FormData) {
  const nextPath = safeNextPath(formData.get("next"));
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } finally {
    redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  }
}

