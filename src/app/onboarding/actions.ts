"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string; success?: string };

function makeSlug(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function saveArtistProfile(_previous: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ARTIST") return { error: "Sign in with an artist account to edit your studio profile." };

  const businessName = String(formData.get("business_name") || "").trim();
  const slug = makeSlug(String(formData.get("booking_slug") || businessName));
  const description = String(formData.get("description") || "").trim();
  const contactEmail = String(formData.get("contact_email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const location = String(formData.get("business_location") || "Lagos, Nigeria").trim();
  const timezone = String(formData.get("timezone") || "Africa/Lagos").trim();

  if (businessName.length < 2) return { error: "Add a studio or professional name." };
  if (!slug || slug.length > 50) return { error: "Choose a short, valid booking link." };
  if (!/^\S+@\S+\.\S+$/.test(contactEmail)) return { error: "Add a valid contact email." };
  if (description.length < 20) return { error: "Add a short studio introduction (at least 20 characters) before continuing." };
  if (description.length > 500) return { error: "Keep your introduction under 500 characters." };
  if (!location) return { error: "Add your business location." };
  if (!["Africa/Lagos", "Africa/Accra", "Europe/London", "America/New_York"].includes(timezone)) return { error: "Choose a supported time zone." };

  const supabase = await createClient();
  const { error } = await supabase.from("artist_profiles").upsert({
    user_id: profile.id,
    business_name: businessName,
    booking_slug: slug,
    description,
    contact_email: contactEmail,
    phone: phone || null,
    business_location: location,
    timezone,
  }, { onConflict: "user_id" });

  if (error?.code === "23505") return { error: "That booking link is already in use. Try another one." };
  if (error) {
    console.error("BeatBook studio profile save failed", { code: error.code, message: error.message, details: error.details, hint: error.hint });
    return {
      error: process.env.NODE_ENV === "development"
        ? `Supabase error ${error.code || "unknown"}: ${error.message}`
        : "We couldn’t save your studio profile. Check the Supabase migration and try again.",
    };
  }
  revalidatePath("/onboarding");
  redirect("/onboarding#services");
}

