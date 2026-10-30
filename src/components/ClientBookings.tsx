"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { clientRequestCancellation, clientRequestReschedule, runTestDeposit } from "@/app/book/actions";

type ClientBooking = {
  id: string; appointment_start: string; timezone_snapshot: string; service_name_snapshot: string;
  travel_area_name_snapshot: string; full_address: string; status: string; payment_status: string;
  total_snapshot: number; deposit_amount_snapshot: number; remaining_balance_snapshot: number;
  reservation_expires_at: string | null; artist: { business_name: string } | { business_name: string }[] | null;
};

export default function ClientBookings({ bookings: initial }: { bookings: ClientBooking[] }) {
  const [bookings, setBookings] = useState(initial);
  const [notice, setNotice] = useState("");
  const [proposedTimes, setProposedTimes] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  function pay(id: string, success: boolean) {
    startTransition(async () => {
      const result = await runTestDeposit(id, success, crypto.randomUUID());
      if (result.error) { setNotice(result.error); return; }
      setBookings((rows) => rows.map((row) => row.id === id ? { ...row, status: result.booking?.status || row.status, payment_status: result.booking?.payment_status || row.payment_status } : row));
      setNotice(result.success || "Test payment updated.");
    });
  }
  function cancel(id: string) {
    startTransition(async () => {
      const result = await clientRequestCancellation(id, "");
      if (result.error) { setNotice(result.error); return; }
      setBookings((rows) => rows.map((row) => row.id === id ? { ...row, status: "CANCELLATION_REQUESTED" } : row));
      setNotice(result.success || "Cancellation request sent.");
    });
  }
  function reschedule(id: string) {
    const time = proposedTimes[id];
    if (!time) { setNotice("Choose a proposed date and time in the artist’s time zone."); return; }
    startTransition(async () => {
      const result = await clientRequestReschedule(id, time);
      if (result.error) { setNotice(result.error); return; }
      setBookings((rows) => rows.map((row) => row.id === id ? { ...row, status: "RESCHEDULE_REQUESTED" } : row));
      setNotice(result.success || "Reschedule request sent.");
    });
  }

  return <main className="my-bookings-page"><header className="my-bookings-header"><Link className="auth-brand" href="/book"><span className="brand-mark">b.</span> beatbook</Link><Link href="/book">Book another appointment ↗</Link></header><div className="my-bookings-wrap"><span className="eyebrow">YOUR BEAUTY PLANS</span><h1>My bookings</h1><p>Requests, appointments, and deposit status in one place.</p>{notice && <div className="notice"><span>✓</span>{notice}<button onClick={() => setNotice("")}>×</button></div>}{bookings.length === 0 ? <section className="card empty-bookings"><h2>Your booking list is empty.</h2><p>Browse your artist’s services and send an appointment request.</p><Link className="button primary" href="/book">Browse booking page <span>→</span></Link></section> : <div className="client-booking-list">{bookings.map((booking) => { const artist = Array.isArray(booking.artist) ? booking.artist[0] : booking.artist; const date = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: booking.timezone_snapshot }).format(new Date(booking.appointment_start)); const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: booking.timezone_snapshot }).format(new Date(booking.appointment_start)); return <article className="card client-booking-card" key={booking.id}><div className="client-booking-top"><div><span className="eyebrow">{artist?.business_name || "BEATBOOK ARTIST"}</span><h2>{booking.service_name_snapshot}</h2></div><span className={`status ${booking.status === "CONFIRMED" ? "green-status" : booking.status === "AWAITING_PAYMENT" ? "blue-status" : booking.status === "PENDING_APPROVAL" ? "amber-status" : "red-status"}`}>{booking.status.replaceAll("_", " ")}</span></div><div className="client-booking-detail"><span>▦ &nbsp;{date} · {time}</span><span>⌖ &nbsp;{booking.travel_area_name_snapshot}</span><span>⌂ &nbsp;{booking.full_address}</span></div><div className="client-booking-money"><span>Total <strong>₦{booking.total_snapshot.toLocaleString()}</strong></span><span>Deposit <strong>₦{booking.deposit_amount_snapshot.toLocaleString()}</strong></span><span>Balance <strong>₦{booking.remaining_balance_snapshot.toLocaleString()}</strong></span></div>{booking.status === "AWAITING_PAYMENT" && <div className="test-payment-box"><strong>Test payment only</strong><p>Choose an outcome to exercise the booking flow. No real money is collected.</p>{booking.reservation_expires_at && <small>Reservation deadline: {new Date(booking.reservation_expires_at).toLocaleTimeString()}</small>}<div><button disabled={pending} onClick={() => pay(booking.id, true)}>Simulate success</button><button disabled={pending} onClick={() => pay(booking.id, false)}>Simulate failure</button></div></div>}{booking.status === "CONFIRMED" && <div className="client-manage-actions"><label>PROPOSE A NEW TIME IN {booking.timezone_snapshot}<input type="datetime-local" value={proposedTimes[booking.id] || ""} onChange={(e) => setProposedTimes((values) => ({ ...values, [booking.id]: e.target.value }))} /></label><button className="quiet-button" disabled={pending} onClick={() => reschedule(booking.id)}>Request reschedule</button><button className="decline-button" disabled={pending} onClick={() => cancel(booking.id)}>Request cancellation</button></div>}</article>; })}</div>}</div></main>;
}

