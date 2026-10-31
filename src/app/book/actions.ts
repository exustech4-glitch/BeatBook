"use server";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type BookingActionState = { error?: string; success?: string; bookingId?: string };

export async function getBookingAccountRole(): Promise<"CLIENT" | "ARTIST" | "GUEST"> {
  const profile = await getCurrentProfile();
  return profile?.role || "GUEST";
}

export async function createBookingRequest(_previous: BookingActionState, formData: FormData): Promise<BookingActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sign in or create a client account before sending a request." };
  if (profile.role !== "CLIENT") return { error: "Use a client account to request an appointment." };

  const artistId = String(formData.get("artist_id") || "");
  const serviceId = String(formData.get("service_id") || "");
  const areaId = String(formData.get("travel_area_id") || "");
  const localStart = String(formData.get("appointment_start") || "");
  const address = String(formData.get("full_address") || "").trim();
  if (!artistId || !serviceId || !areaId || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localStart) || address.length < 8) {
    return { error: "Complete the service, date, time, area, and appointment address." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_booking_request", {
    p_artist_id: artistId,
    p_service_id: serviceId,
    p_travel_area_id: areaId,
    p_appointment_start: localStart,
    p_full_address: address,
  });
  if (error) return { error: error.message || "That appointment couldn’t be requested." };
  return { success: "Your request was sent. The artist will respond within 24 hours.", bookingId: String(data) };
}

export async function decideBooking(bookingId: string, approve: boolean) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ARTIST") return { error: "Artist access is required." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("decide_booking_request", { p_booking_id: bookingId, p_approve: approve });
  if (error) return { error: error.message };
  return { success: approve ? "Request approved. The client has 15 minutes to complete the test deposit." : "Request declined.", booking: data };
}

export async function runTestDeposit(bookingId: string, success: boolean, idempotencyKey: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "CLIENT") return { error: "Sign in with the client account that made this booking." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("simulate_deposit", {
    p_booking_id: bookingId,
    p_success: success,
    p_idempotency_key: idempotencyKey,
  });
  if (error) return { error: error.message };
  return { success: data?.status === "CONFIRMED" ? "Test deposit recorded. Appointment confirmed; no money was charged." : "Test payment failed. The appointment is not confirmed.", booking: data };
}

export async function clientRequestCancellation(bookingId: string, reason: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "CLIENT") return { error: "Sign in with your client account." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_cancellation", { p_booking_id: bookingId, p_reason: reason.slice(0, 500) });
  return error ? { error: error.message } : { success: "Cancellation request sent to the artist." };
}

export async function clientRequestReschedule(bookingId: string, localStart: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "CLIENT") return { error: "Sign in with your client account." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_reschedule", { p_booking_id: bookingId, p_proposed_start: localStart });
  return error ? { error: error.message } : { success: "Reschedule request sent. Your existing time stays reserved while the artist reviews it." };
}

export async function decideCancellation(bookingId: string, approve: boolean) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ARTIST") return { error: "Artist access is required." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("decide_cancellation", { p_booking_id: bookingId, p_approve: approve });
  return error ? { error: error.message } : { success: approve ? "Cancellation approved." : "Cancellation declined; the appointment remains confirmed.", booking: data };
}

export async function decideReschedule(bookingId: string, approve: boolean) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "ARTIST") return { error: "Artist access is required." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("decide_reschedule", { p_booking_id: bookingId, p_approve: approve });
  return error ? { error: error.message } : { success: approve ? "Reschedule approved." : "Reschedule declined; the original time remains confirmed.", booking: data };
}

