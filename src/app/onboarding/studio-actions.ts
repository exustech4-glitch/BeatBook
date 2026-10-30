"use server";

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
  const areaName = String(formData.get("area_name") || "").trim();
  const travelFee = Number(formData.get("travel_fee_ngn"));
  const opening = String(formData.get("opening_time") || "09:00");
  const closing = String(formData.get("closing_time") || "17:00");
  const deposit = Number(formData.get("deposit_percent"));
  const cancellation = String(formData.get("cancellation_terms") || "").trim();
  if (serviceName.length < 2 || !Number.isInteger(price) || price < 0 || !Number.isInteger(duration) || duration < 15 || duration > 1440) return { error: "Add a valid service name, price, and duration (15 minutes to 24 hours)." };
  if (!areaName || !Number.isInteger(travelFee) || travelFee < 0) return { error: "Add a valid travel area and fee." };
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

  const { data: existingArea } = await supabase.from("travel_areas").select("id").eq("artist_id", profile.id).eq("name", areaName).maybeSingle();
  const areaSave = existingArea
    ? await supabase.from("travel_areas").update({ fee_ngn: travelFee, active: true }).eq("id", existingArea.id)
    : await supabase.from("travel_areas").insert({ artist_id: profile.id, name: areaName, fee_ngn: travelFee, active: true });
  if (areaSave.error) return { error: "Couldn’t save the travel area." };

  const { data: latest } = await supabase.from("policy_versions").select("version").eq("artist_id", profile.id).order("version", { ascending: false }).limit(1).maybeSingle();
  const { error: policyError } = await supabase.from("policy_versions").insert({
    artist_id: profile.id, version: (latest?.version || 0) + 1,
    cancellation_terms: cancellation || "Cancellations are accepted up to 48 hours before your appointment.",
    refund_terms: "Any refund outcome is handled according to the cancellation terms shown when you book.",
    deposit_type: "PERCENTAGE", deposit_value: deposit,
  });
  if (policyError) return { error: "Couldn’t save your deposit and cancellation policy." };
  return { success: "Services, working hours, travel fees, and policies saved." };
}

export async function publishArtistProfile(): Promise<StudioSetupState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ARTIST") return { error: "Artist access is required." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_artist_profile");
  if (error) return { error: error.message || "Finish all required setup steps before publishing." };
  return { success: "Your booking page is live. You can share your booking link with clients." };
}

