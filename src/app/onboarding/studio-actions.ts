"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type StudioSetupState = { error?: string; success?: string };

export async function saveStudioSetup(_previous: StudioSetupState, formData: FormData): Promise<StudioSetupState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ARTIST") return { error: "Artist access is required." };
  const serviceName = String(formData.get("service_name") || "").trim();
  const serviceDescription = String(formData.get("service_description") || "").trim();
  const price = Number(formData.get("price_ngn"));
  const duration = Number(formData.get("duration_minutes"));
  const areaNames = formData.getAll("area_name").map((value) => String(value).trim());
  const travelFees = formData.getAll("travel_fee_ngn").map((value) => Number(value));
  const opening = String(formData.get("opening_time") || "09:00");
  const closing = String(formData.get("closing_time") || "17:00");
  const deposit = Number(formData.get("deposit_percent"));
  const cancellation = String(formData.get("cancellation_terms") || "").trim();
  if (serviceName.length < 2 || !Number.isInteger(price) || price < 0 || !Number.isInteger(duration) || duration < 15 || duration > 1440) return { error: "Add a valid service name, price, and duration (15 minutes to 24 hours)." };
  if (!areaNames.length || areaNames.some((name) => !name || name.length > 100) || travelFees.length !== areaNames.length || travelFees.some((fee) => !Number.isInteger(fee) || fee < 0)) return { error: "Add a valid name and fee for every travel area." };
  if (new Set(areaNames.map((name) => name.toLocaleLowerCase())).size !== areaNames.length) return { error: "Each travel area must have a unique name." };
  if (opening >= closing) return { error: "Closing time must be later than opening time." };
  if (!Number.isInteger(deposit) || deposit < 0 || deposit > 100) return { error: "Deposit must be between 0% and 100%." };

  const openDays = [0, 1, 2, 3, 4, 5, 6].filter((day) => formData.get(`open_${day}`) === "on");
  if (!openDays.length) return { error: "Choose at least one working day." };

  const supabase = await createClient();
  const { data: existingService } = await supabase.from("services").select("id").eq("artist_id", profile.id).eq("name", serviceName).maybeSingle();
  const serviceSave = existingService
    ? await supabase.from("services").update({ description: serviceDescription, price_ngn: price, duration_minutes: duration, active: true }).eq("id", existingService.id)
    : await supabase.from("services").insert({ artist_id: profile.id, name: serviceName, description: serviceDescription, price_ngn: price, duration_minutes: duration, active: true });
  if (serviceSave.error) return { error: "Couldn’t save the service. Check the database migration and try again." };

  const hours = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    artist_id: profile.id, weekday, opening_time: opening, closing_time: closing, is_closed: !openDays.includes(weekday),
  }));
  const { error: hoursError } = await supabase.from("working_hours").upsert(hours, { onConflict: "artist_id,weekday" });
  if (hoursError) return { error: "Couldn’t save your working hours." };

  const { data: existingAreas, error: existingAreasError } = await supabase.from("travel_areas").select("id,name,active").eq("artist_id", profile.id);
  if (existingAreasError) return { error: "Couldn’t load your saved travel areas. Refresh and try again." };
  const areaSave = await supabase.from("travel_areas").upsert(
    areaNames.map((name, index) => ({ artist_id: profile.id, name, fee_ngn: travelFees[index], active: true })),
    { onConflict: "artist_id,name" },
  );
  if (areaSave.error) return { error: "Couldn’t save the travel areas." };
  const areaNamesToKeep = new Set(areaNames.map((name) => name.toLocaleLowerCase()));
  const areaIdsToDeactivate = (existingAreas || []).filter((item) => item.active && !areaNamesToKeep.has(item.name.toLocaleLowerCase())).map((item) => item.id);
  if (areaIdsToDeactivate.length) {
    const { error: deactivateError } = await supabase.from("travel_areas").update({ active: false }).eq("artist_id", profile.id).in("id", areaIdsToDeactivate);
    if (deactivateError) return { error: "Your areas were saved, but a removed area could not be paused. Please save again." };
  }

  const { data: latest } = await supabase.from("policy_versions").select("version").eq("artist_id", profile.id).order("version", { ascending: false }).limit(1).maybeSingle();
  const { error: policyError } = await supabase.from("policy_versions").insert({
    artist_id: profile.id, version: (latest?.version || 0) + 1,
    cancellation_terms: cancellation || "Cancellations are accepted up to 48 hours before your appointment.",
    refund_terms: "Any refund outcome is handled according to the cancellation terms shown when you book.",
    deposit_type: "PERCENTAGE", deposit_value: deposit,
  });
  if (policyError) return { error: "Couldn’t save your deposit and cancellation policy." };
  return { success: `Service, working hours, ${areaNames.length} travel area${areaNames.length === 1 ? "" : "s"}, and policies saved.` };
}

export async function publishArtistProfile(): Promise<StudioSetupState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ARTIST") return { error: "Artist access is required." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_artist_profile");
  if (error) {
    const message = error.message || "Finish all required setup steps before publishing.";
    if (message.includes("schema cache") || message.includes("publish_artist_profile") && message.includes("Could not find")) {
      return { error: "The booking lifecycle migration is not installed yet. Apply the updated 20261030000200_booking_lifecycle.sql migration in Supabase, then try again." };
    }
    if (message.includes("Complete your business profile first")) return { error: "Add a studio introduction, then save your business profile before publishing." };
    if (message.includes("Add at least one active service")) return { error: "Save at least one active service before publishing." };
    if (message.includes("Set your weekly working hours")) return { error: "Choose at least one working day and save your studio setup before publishing." };
    if (message.includes("Add at least one travel area")) return { error: "Add and save a travel area before publishing." };
    if (message.includes("Set your deposit and cancellation policy")) return { error: "Save your deposit and cancellation policy before publishing." };
    return { error: message };
  }
  revalidatePath("/onboarding");
  return { success: "Your booking page is live. You can share your booking link with clients." };
}

