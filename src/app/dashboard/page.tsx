import BeatBook from "@/components/BeatBook";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const profile = await requireRole("ARTIST");
  const supabase = await createClient();
  const [bookingsResult, servicesResult, areasResult, policyResult, studioResult] = await Promise.all([
    supabase.from("bookings")
      .select("id,appointment_start,timezone_snapshot,service_name_snapshot,travel_area_name_snapshot,status,total_snapshot,client:profiles!bookings_client_id_fkey(display_name)")
      .eq("artist_id", profile.id)
      .order("appointment_start", { ascending: true }),
    supabase.from("services").select("id,name,description,price_ngn,duration_minutes,active").eq("artist_id", profile.id).order("created_at"),
    supabase.from("travel_areas").select("id,name,fee_ngn,active").eq("artist_id", profile.id).order("name"),
    supabase.from("policy_versions").select("deposit_type,deposit_value,cancellation_terms").eq("artist_id", profile.id).order("version", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("artist_profiles").select("business_name,business_location,timezone,booking_slug,contact_email").eq("user_id", profile.id).maybeSingle(),
  ]);
  const initialBookings = (bookingsResult.data || []).map((booking) => {
    const client = Array.isArray(booking.client) ? booking.client[0] : booking.client;
    const instant = new Date(booking.appointment_start);
    const date = new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric", timeZone: booking.timezone_snapshot }).format(instant);
    const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: booking.timezone_snapshot }).format(instant);
    const timeKey = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: booking.timezone_snapshot }).format(instant);
    const parts = new Intl.DateTimeFormat("en", { timeZone: booking.timezone_snapshot, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
    const getPart = (type: string) => parts.find((part) => part.type === type)?.value || "";
    const dateKey = `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
    const status = ({
      PENDING_APPROVAL: "Pending approval", AWAITING_PAYMENT: "Awaiting payment", CONFIRMED: "Confirmed",
      DECLINED: "Declined", REQUEST_EXPIRED: "Request expired", PAYMENT_EXPIRED: "Payment expired",
      CANCELLATION_REQUESTED: "Cancellation requested", RESCHEDULE_REQUESTED: "Reschedule requested", CANCELLED: "Cancelled",
    } as Record<string, "Pending approval" | "Awaiting payment" | "Confirmed" | "Declined" | "Request expired" | "Payment expired" | "Cancellation requested" | "Reschedule requested" | "Cancelled">)[booking.status] || "Request expired";
    return { id: booking.id, client: client?.display_name || "Client", service: booking.service_name_snapshot, date, dateKey, time, timeKey, area: booking.travel_area_name_snapshot, status, amount: booking.total_snapshot };
  });
  const studio = studioResult.data;
  return <BeatBook
    initialView="dashboard"
    initialBookings={initialBookings}
    studioName={studio?.business_name || profile.display_name}
    studioLocation={studio?.business_location || ""}
    studioTimezone={studio?.timezone || "Africa/Lagos"}
    bookingSlug={studio?.booking_slug || ""}
    contactEmail={studio?.contact_email || profile.email}
    dashboardServices={servicesResult.data || []}
    dashboardAreas={areasResult.data || []}
    dashboardPolicy={policyResult.data}
  />;
}

