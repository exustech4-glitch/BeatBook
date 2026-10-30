import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ClientBookings from "@/components/ClientBookings";

export default async function MyBookingsPage() {
  const profile = await requireRole("CLIENT");
  const supabase = await createClient();
  const { data } = await supabase.from("bookings")
    .select("id,appointment_start,appointment_end,timezone_snapshot,service_name_snapshot,travel_area_name_snapshot,full_address,status,payment_status,total_snapshot,deposit_amount_snapshot,remaining_balance_snapshot,reservation_expires_at,artist:artist_profiles!bookings_artist_id_fkey(business_name)")
    .eq("client_id", profile.id)
    .order("appointment_start", { ascending: false });
  return <ClientBookings bookings={data || []} />;
}

