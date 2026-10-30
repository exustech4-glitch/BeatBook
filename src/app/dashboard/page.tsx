import BeatBook from "@/components/BeatBook";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const profile = await requireRole("ARTIST");
  const supabase = await createClient();
  const { data } = await supabase.from("bookings")
    .select("id,appointment_start,timezone_snapshot,service_name_snapshot,travel_area_name_snapshot,status,total_snapshot,client:profiles!bookings_client_id_fkey(display_name)")
    .eq("artist_id", profile.id)
    .order("appointment_start", { ascending: true });
  const initialBookings = (data || []).map((booking) => {
    const client = Array.isArray(booking.client) ? booking.client[0] : booking.client;
    const date = new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric", timeZone: booking.timezone_snapshot }).format(new Date(booking.appointment_start));
    const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: booking.timezone_snapshot }).format(new Date(booking.appointment_start));
    const status = ({ PENDING_APPROVAL: "Pending approval", AWAITING_PAYMENT: "Awaiting payment", CONFIRMED: "Confirmed", DECLINED: "Declined", REQUEST_EXPIRED: "Request expired", PAYMENT_EXPIRED: "Payment expired" } as Record<string, "Pending approval" | "Awaiting payment" | "Confirmed" | "Declined" | "Request expired" | "Payment expired">)[booking.status] || "Request expired";
    return { id: booking.id, client: client?.display_name || "Client", service: booking.service_name_snapshot, date, time, area: booking.travel_area_name_snapshot, status, amount: booking.total_snapshot };
  });
  return <BeatBook initialView="dashboard" initialBookings={initialBookings} />;
}

