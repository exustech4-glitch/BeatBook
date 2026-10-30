import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function loadPublicArtist(slug?: string) {
  if (!getSupabaseEnv()) return null;
  const supabase = await createClient();
  let query = supabase.from("artist_profiles").select("user_id,business_name,booking_slug,business_location,timezone,contact_email").eq("is_published", true);
  if (slug) query = query.eq("booking_slug", slug);
  const { data: artist, error } = await query.limit(1).maybeSingle();
  if (error || !artist) return null;

  const [services, areas, hours, policy] = await Promise.all([
    supabase.from("services").select("id,name,description,price_ngn,duration_minutes").eq("artist_id", artist.user_id).eq("active", true).order("created_at"),
    supabase.from("travel_areas").select("id,name,fee_ngn").eq("artist_id", artist.user_id).eq("active", true).order("name"),
    supabase.from("working_hours").select("weekday,opening_time,closing_time,is_closed").eq("artist_id", artist.user_id),
    supabase.from("policy_versions").select("deposit_type,deposit_value,cancellation_terms").eq("artist_id", artist.user_id).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (services.error || areas.error || hours.error || !services.data?.length || !areas.data?.length) return null;
  const depositPercent = policy.data?.deposit_type === "PERCENTAGE" ? policy.data.deposit_value : 0;
  return {
    artist: { id: artist.user_id, business_name: artist.business_name, booking_slug: artist.booking_slug, business_location: artist.business_location, timezone: artist.timezone, contact_email: artist.contact_email },
    services: services.data.map((service, i) => ({ ...service, tag: i === 0 ? "FEATURED" : "", icon: ["✳", "✺", "♡"][i % 3] })),
    areas: areas.data,
    hours: hours.data,
    depositPercent,
    cancellationTerms: policy.data?.cancellation_terms || "Cancellations are accepted up to 48 hours before your appointment.",
  };
}

