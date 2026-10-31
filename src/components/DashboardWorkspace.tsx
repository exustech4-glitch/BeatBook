"use client";

import { useState } from "react";
import Link from "next/link";

type BookingRow = {
  id: string | number;
  client: string;
  service: string;
  date: string;
  dateKey?: string;
  time: string;
  area: string;
  status: string;
  amount: number;
};
type ServiceRow = { id: string; name: string; description: string; price_ngn: number; duration_minutes: number; active: boolean };
type AreaRow = { id: string; name: string; fee_ngn: number; active: boolean };

const navText: Record<string, { intro: string; empty: string }> = {
  Bookings: { intro: "Review requests and keep track of every appointment.", empty: "Your booking list is empty for now." },
  Calendar: { intro: "See your appointments by day and move through your schedule.", empty: "No appointments are scheduled for this day." },
  Services: { intro: "Review the services and prices clients see on your booking page.", empty: "Add a service to start building your booking page." },
  "Travel areas": { intro: "Check the locations you serve and their travel fees.", empty: "Add a travel area so clients know where you work." },
  "Deposits & policies": { intro: "Review your deposit and cancellation terms.", empty: "Set your deposit and cancellation policy during setup." },
  Settings: { intro: "Manage the studio details shown to your clients.", empty: "Complete your studio profile to see your settings." },
};

function dateKeyInZone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function dateKeyForDay(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function formatDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export default function DashboardWorkspace({
  section, bookings, services, areas, policy, businessName, businessLocation, timezone, bookingSlug, contactEmail,
  onDecide, onReviewChange, pending, initialDate,
}: {
  section: string;
  bookings: BookingRow[];
  services: ServiceRow[];
  areas: AreaRow[];
  policy: { deposit_type: string; deposit_value: number; cancellation_terms: string } | null;
  businessName: string;
  businessLocation: string;
  timezone: string;
  bookingSlug: string;
  contactEmail: string;
  onDecide: (id: string | number, approve: boolean) => void;
  onReviewChange: (id: string | number, approve: boolean, kind: "Cancellation requested" | "Reschedule requested") => void;
  pending: boolean;
  initialDate?: string;
}) {
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => initialDate || dateKeyInZone(new Date(), timezone));
  const content = navText[section] || navText.Bookings;

  if (section === "Bookings") return <section className="workspace-panel">
    <div className="workspace-panel-head"><div><span className="eyebrow">YOUR STUDIO</span><h2>All bookings</h2><p>{content.intro}</p></div><span className="workspace-total">{bookings.length} total</span></div>
    {bookings.length ? <div className="workspace-booking-list">{bookings.map((booking) => <article className="workspace-booking" key={booking.id}>
      <div className="workspace-booking-date"><strong>{booking.date.split(",")[0]}</strong><span>{booking.time}</span></div>
      <div className="workspace-booking-info"><div className="workspace-booking-title"><h3>{booking.client}</h3><span className={`status ${booking.status === "Confirmed" ? "green-status" : booking.status === "Pending approval" || booking.status.includes("requested") ? "amber-status" : booking.status === "Awaiting payment" ? "blue-status" : "red-status"}`}>{booking.status}</span></div><p>{booking.service} · {booking.area} · ₦{booking.amount.toLocaleString()}</p></div>
      {booking.status === "Pending approval" ? <div className="workspace-actions"><button className="quiet-button" disabled={pending} onClick={() => onDecide(booking.id, false)}>Decline</button><button className="approve-button" disabled={pending} onClick={() => onDecide(booking.id, true)}>Approve</button></div> : booking.status === "Cancellation requested" || booking.status === "Reschedule requested" ? <div className="workspace-actions"><button className="quiet-button" disabled={pending} onClick={() => onReviewChange(booking.id, false, booking.status as "Cancellation requested" | "Reschedule requested")}>Decline</button><button className="approve-button" disabled={pending} onClick={() => onReviewChange(booking.id, true, booking.status as "Cancellation requested" | "Reschedule requested")}>Approve</button></div> : null}
    </article>)}</div> : <div className="workspace-empty"><span>▤</span><h3>{content.empty}</h3><p>New requests will appear here when a client books.</p></div>}
  </section>;

  if (section === "Calendar") {
    const year = monthAnchor.getFullYear();
    const month = monthAnchor.getMonth();
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const dayCount = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: offset + dayCount }, (_, i) => i < offset ? null : i - offset + 1);
    const selectedBookings = bookings.filter((booking) => booking.dateKey === selectedDate);
    return <section className="workspace-panel">
      <div className="workspace-panel-head"><div><span className="eyebrow">YOUR STUDIO</span><h2>Calendar</h2><p>{content.intro}</p></div></div>
      <div className="workspace-calendar-layout"><div className="workspace-calendar card"><div className="date-month"><button aria-label="Previous month" onClick={() => setMonthAnchor(new Date(year, month - 1, 1))}>‹</button><strong>{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(monthAnchor)}</strong><button aria-label="Next month" onClick={() => setMonthAnchor(new Date(year, month + 1, 1))}>›</button></div><div className="workspace-calendar-grid">{["M", "T", "W", "T", "F", "S", "S"].map((day, i) => <span className="weekday" key={`${day}-${i}`}>{day}</span>)}{days.map((day, i) => { const key = day ? dateKeyForDay(year, month, day) : ""; const hasBooking = bookings.some((booking) => booking.dateKey === key); return <button key={i} disabled={!day} className={`calendar-day ${key === selectedDate ? "workspace-selected-day" : ""} ${hasBooking ? "has-event" : ""}`} onClick={() => day && setSelectedDate(key)}>{day}<i/></button>; })}</div></div>
        <div className="workspace-day-list"><span className="eyebrow">SELECTED DAY</span><h3>{formatDateKey(selectedDate)}</h3>{selectedBookings.length ? selectedBookings.map((booking) => <article className="workspace-day-booking" key={booking.id}><span className="workspace-day-time">{booking.time}</span><div><strong>{booking.client}</strong><small>{booking.service} · {booking.area}</small></div><span className={`status ${booking.status === "Confirmed" ? "green-status" : "amber-status"}`}>{booking.status}</span></article>) : <div className="workspace-empty compact"><span>▦</span><p>{content.empty}</p></div>}</div>
      </div>
    </section>;
  }

  return <section className="workspace-panel">
    <div className="workspace-panel-head"><div><span className="eyebrow">YOUR STUDIO</span><h2>{section}</h2><p>{content.intro}</p></div><Link className="button primary" href={section === "Settings" ? "/onboarding" : "/onboarding#services"}>Edit setup <span>→</span></Link></div>
    {section === "Services" && (services.length ? <div className="workspace-data-grid">{services.map((service) => <article className="workspace-data-card" key={service.id}><span className="workspace-data-icon">✳</span><h3>{service.name}</h3><p>{service.description || "Beauty service"}</p><div><strong>₦{service.price_ngn.toLocaleString()}</strong><span>{service.duration_minutes} min</span></div><small className={service.active ? "workspace-active" : "workspace-inactive"}>{service.active ? "Available for booking" : "Paused"}</small></article>)}</div> : <div className="workspace-empty"><span>✳</span><h3>{content.empty}</h3><Link href="/onboarding#services">Add your first service <b>→</b></Link></div>)}
    {section === "Travel areas" && (areas.length ? <div className="workspace-data-grid">{areas.map((area) => <article className="workspace-data-card" key={area.id}><span className="workspace-data-icon">⌖</span><h3>{area.name}</h3><p>Travel fee for appointments in this area</p><div><strong>₦{area.fee_ngn.toLocaleString()}</strong><span/></div><small className={area.active ? "workspace-active" : "workspace-inactive"}>{area.active ? "Available for booking" : "Paused"}</small></article>)}</div> : <div className="workspace-empty"><span>⌖</span><h3>{content.empty}</h3><Link href="/onboarding#services">Add a travel area <b>→</b></Link></div>)}
    {section === "Deposits & policies" && <div className="workspace-policy-grid"><article className="workspace-data-card"><span className="eyebrow">DEPOSIT</span><h3>{policy ? (policy.deposit_type === "PERCENTAGE" ? `${policy.deposit_value}% of total` : `₦${policy.deposit_value.toLocaleString()}`) : "Not set yet"}</h3><p>Clients see this before they send a booking request.</p></article><article className="workspace-data-card"><span className="eyebrow">CANCELLATION POLICY</span><p className="workspace-policy-copy">{policy?.cancellation_terms || content.empty}</p></article></div>}
    {section === "Settings" && <div className="workspace-settings-grid">{[["Business name", businessName], ["Location", businessLocation], ["Time zone", timezone], ["Contact email", contactEmail], ["Booking page", bookingSlug ? `/book/${bookingSlug}` : "Not published"]].map(([label, value]) => <article className="workspace-setting-row" key={label}><span>{label}</span><strong>{value || "Not set"}</strong></article>)}</div>}
  </section>;
}

