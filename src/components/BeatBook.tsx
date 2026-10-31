"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { createBookingRequest, decideBooking, decideCancellation, decideReschedule } from "@/app/book/actions";
import DashboardWorkspace from "@/components/DashboardWorkspace";

type Status = "Pending approval" | "Confirmed" | "Awaiting payment" | "Declined" | "Request expired" | "Payment expired" | "Cancellation requested" | "Reschedule requested" | "Cancelled";
type Booking = { id: number | string; client: string; service: string; date: string; dateKey?: string; time: string; timeKey?: string; area: string; status: Status; amount: number };
const demoBookings: Booking[] = [
  { id: 1, client: "Amara Okafor", service: "Bridal makeup", date: "May 20, 2025", time: "10:00 AM", area: "Ikoyi", status: "Confirmed", amount: 160 },
  { id: 2, client: "Tomi Adebayo", service: "Party makeup", date: "May 22, 2025", time: "1:00 PM", area: "Lekki Phase 1", status: "Pending approval", amount: 130 },
  { id: 3, client: "Nneka Obi", service: "Engagement makeup", date: "May 25, 2025", time: "2:00 PM", area: "Victoria Island", status: "Pending approval", amount: 145 },
];
const demoServices = [
  { id: "demo-bridal", name: "Bridal makeup", description: "Your moment, made unforgettable.", duration_minutes: 120, price_ngn: 75000, tag: "MOST LOVED", icon: "✳" },
  { id: "demo-party", name: "Party makeup", description: "A little extra for your next big night.", duration_minutes: 90, price_ngn: 60000, tag: "", icon: "✺" },
  { id: "demo-engagement", name: "Engagement makeup", description: "Soft glam for the start of forever.", duration_minutes: 120, price_ngn: 65000, tag: "", icon: "♡" },
];
const heroPhoto = "https://images.unsplash.com/photo-1758613653823-5baa7dd8073e?auto=format&fit=crop&w=1400&q=85";
const servicePhotos = [
  "https://images.unsplash.com/photo-1699207012725-72af224cca65?auto=format&fit=crop&w=700&q=80",
  "https://images.unsplash.com/photo-1758739011301-0d348a60d32e?auto=format&fit=crop&w=700&q=80",
  "https://images.unsplash.com/photo-1791338745960-5d09913ccb8e?auto=format&fit=crop&w=700&q=80",
];
const glamMoods = [
  { id: "soft", icon: "✧", name: "Soft glam", note: "Fresh, glowy & romantic", keywords: ["soft", "natural", "classic", "day"] },
  { id: "main", icon: "✦", name: "Main character", note: "A little extra, all eyes on you", keywords: ["party", "event", "full", "glam"] },
  { id: "bridal", icon: "♡", name: "Bridal glow", note: "Made for your forever photos", keywords: ["bridal", "wedding", "engagement"] },
  { id: "muse", icon: "✹", name: "Creative muse", note: "Bold, playful & unforgettable", keywords: ["editorial", "creative", "bold", "fashion"] },
];
const demoAreas = [{ id: "demo-ikoyi", name: "Ikoyi", fee_ngn: 5000 }, { id: "demo-lekki", name: "Lekki Phase 1", fee_ngn: 7500 }, { id: "demo-vi", name: "Victoria Island", fee_ngn: 6000 }];
const navItems = ["Overview", "Bookings", "Calendar", "Services", "Travel areas", "Deposits & policies", "Settings"];
function durationLabel(minutes: number) { return minutes % 60 === 0 ? `${minutes / 60} hr${minutes === 60 ? "" : "s"}` : `${Math.floor(minutes / 60)} hr ${minutes % 60} min`; }
function displayTime(value: string) { const [hour, minute] = value.split(":").map(Number); return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(2000, 0, 1, hour, minute)); }

type PublicService = (typeof demoServices)[number];
type PublicArea = (typeof demoAreas)[number];
type WeekHour = { weekday: number; opening_time: string; closing_time: string; is_closed: boolean };

function dateKeyInZone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function addDaysToKey(key: string, days: number) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function nextBookingDate(timezone: string, hours?: WeekHour[]) {
  const today = dateKeyInZone(new Date(), timezone);
  for (let offset = 1; offset <= 14; offset += 1) {
    const key = addDaysToKey(today, offset);
    const weekday = new Date(`${key}T12:00:00Z`).getUTCDay();
    if (!hours || hours.some((hour) => hour.weekday === weekday && !hour.is_closed)) return key;
  }
  return addDaysToKey(today, 1);
}

export default function BeatBook({ initialView = "dashboard", allowSwitch = true, artist, publicServices, travelAreas, workingHours, depositPercent = 25, cancellationTerms, initialBookings, studioName, studioLocation, studioTimezone = "Africa/Lagos", bookingSlug = "", contactEmail = "", dashboardServices = [], dashboardAreas = [], dashboardPolicy = null }: {
  initialView?: "dashboard" | "book";
  allowSwitch?: boolean;
  artist?: { id: string; business_name: string; booking_slug: string; business_location: string; timezone: string; contact_email: string; profile_image_url?: string | null };
  publicServices?: PublicService[];
  travelAreas?: PublicArea[];
  workingHours?: WeekHour[];
  depositPercent?: number;
  cancellationTerms?: string;
  initialBookings?: Booking[];
  studioName?: string;
  studioLocation?: string;
  studioTimezone?: string;
  bookingSlug?: string;
  contactEmail?: string;
  dashboardServices?: { id: string; name: string; description: string; price_ngn: number; duration_minutes: number; active: boolean }[];
  dashboardAreas?: { id: string; name: string; fee_ngn: number; active: boolean }[];
  dashboardPolicy?: { deposit_type: string; deposit_value: number; cancellation_terms: string } | null;
}) {
  const serviceOptions = publicServices?.length ? publicServices : demoServices;
  const areaOptions = travelAreas?.length ? travelAreas : demoAreas;
  const [view, setView] = useState<"dashboard" | "book">(initialView);
  const [activeNav, setActiveNav] = useState("Overview");
  const [bookings, setBookings] = useState(initialBookings ?? demoBookings);
  const [selected, setSelected] = useState(0);
  const [selectedMood, setSelectedMood] = useState("");
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => nextBookingDate(artist?.timezone || studioTimezone, workingHours));
  const [time, setTime] = useState("");
  const [area, setArea] = useState(areaOptions[0]?.id || "demo-ikoyi");
  const [address, setAddress] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingPending, startBooking] = useTransition();
  const bookingMotionRoot = useRef<HTMLDivElement>(null);
  const chosen = serviceOptions[selected] || serviceOptions[0];
  const chosenArea = areaOptions.find((item) => item.id === area) || areaOptions[0];
  const travelFee = chosenArea?.fee_ngn || 0;
  const total = chosen.price_ngn + travelFee;
  const deposit = depositPercent > 0 ? Math.ceil(total * depositPercent / 100) : 0;
  const pending = bookings.filter((b) => ["Pending approval", "Cancellation requested", "Reschedule requested"].includes(b.status));
  const todayParts = new Intl.DateTimeFormat("en", { timeZone: studioTimezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const todayKey = `${todayParts.find((part) => part.type === "year")?.value}-${todayParts.find((part) => part.type === "month")?.value}-${todayParts.find((part) => part.type === "day")?.value}`;
  const bookingTimezone = artist?.timezone || studioTimezone;
  const [calendarFocusDate, setCalendarFocusDate] = useState(todayKey);
  const today = bookings.filter((b) => b.status === "Confirmed" && b.dateKey === todayKey).length;
  const confirmedValue = bookings.filter((b) => b.status === "Confirmed").reduce((sum, b) => sum + b.amount, 0);
  const currentTimeParts = new Intl.DateTimeFormat("en", { timeZone: studioTimezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const currentMinute = Number(currentTimeParts.find((part) => part.type === "hour")?.value || 0) * 60 + Number(currentTimeParts.find((part) => part.type === "minute")?.value || 0);
  const upcomingBookings = bookings.filter((booking) => {
    if (!booking.dateKey || !["Confirmed", "Awaiting payment"].includes(booking.status)) return false;
    if (booking.dateKey !== todayKey) return booking.dateKey > todayKey;
    const [hour, minute] = (booking.timeKey || booking.time).split(":").map(Number);
    return Number.isFinite(hour) && Number.isFinite(minute) && hour * 60 + minute >= currentMinute;
  }).sort((a, b) => `${a.dateKey} ${a.timeKey || a.time}`.localeCompare(`${b.dateKey} ${b.timeKey || b.time}`));
  const studioHour = Number(new Intl.DateTimeFormat("en", { timeZone: studioTimezone, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  const greeting = studioHour < 12 ? "Good morning" : studioHour < 17 ? "Good afternoon" : "Good evening";
  const headingCopy = activeNav === "Overview" ? "Here’s what’s happening at your studio today." : ({ Bookings: "Manage new requests and upcoming appointments.", Calendar: "Your appointments, organized by date.", Services: "The services currently listed on your booking page.", "Travel areas": "Where you’re available to travel for appointments.", "Deposits & policies": "The terms clients see before booking.", Settings: "Your studio profile and public booking details." } as Record<string, string>)[activeNav] || "Manage your studio on BeatBook.";
  const calendarYear = monthAnchor.getFullYear();
  const calendarMonth = monthAnchor.getMonth();
  const monthOffset = (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7;
  const monthDays = Array.from({ length: monthOffset + new Date(calendarYear, calendarMonth + 1, 0).getDate() }, (_, i) => i < monthOffset ? null : i - monthOffset + 1);
  const monthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(monthAnchor);
  const selectedLocalDate = selectedDate ? new Date(`${selectedDate}T12:00:00`) : null;
  const prettySelectedDate = selectedLocalDate ? new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(selectedLocalDate) : "Choose a date";
  const todayLocal = dateKeyInZone(new Date(), bookingTimezone);
  const weekday = selectedLocalDate?.getDay();
  const dayHours = workingHours?.find((item) => item.weekday === weekday && !item.is_closed);
  const selectedDuration = chosen.duration_minutes;
  const availableTimes = dayHours ? (() => {
    const [openHour, openMinute] = dayHours.opening_time.slice(0, 5).split(":").map(Number);
    const [closeHour, closeMinute] = dayHours.closing_time.slice(0, 5).split(":").map(Number);
    const first = Math.ceil((openHour * 60 + openMinute) / 30) * 30;
    const last = closeHour * 60 + closeMinute - selectedDuration;
    const slots = Array.from({ length: Math.max(0, Math.floor((last - first) / 30) + 1) }, (_, i) => first + i * 30);
    const nowParts = new Intl.DateTimeFormat("en", { timeZone: bookingTimezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
    const nowMinute = Number(nowParts.find((part) => part.type === "hour")?.value || 0) * 60 + Number(nowParts.find((part) => part.type === "minute")?.value || 0);
    return slots.filter((minutes) => selectedDate !== todayLocal || minutes > nowMinute).map((minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
  })() : workingHours ? [] : ["10:00", "13:00", "16:00"];

  useEffect(() => {
    if (view !== "book" || !bookingMotionRoot.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
      intro.from(".booking-intro-copy > *", { opacity: 0, y: 18, duration: 0.65, stagger: 0.1 })
        .from(".booking-hero-image", { opacity: 0, scale: 0.97, duration: 0.8 }, "<0.08")
        .from(".artist-card, .booking-section, .policy-note, .summary-card", { opacity: 0, y: 16, duration: 0.5, stagger: 0.07 }, "-=0.25");
    }, bookingMotionRoot);
    return () => context.revert();
  }, [view, artist?.id]);

  function decide(id: number | string, approve: boolean) {
    if (typeof id === "string" && !id.startsWith("demo-")) {
      startBooking(async () => {
        const result = await decideBooking(id, approve);
        if (result.error) { setNotice(result.error); return; }
        setBookings((rows) => rows.map((b) => b.id === id ? { ...b, status: approve ? "Awaiting payment" : "Declined" } : b));
        setNotice(result.success || "Booking updated.");
      });
      return;
    }
    setBookings((rows) => rows.map((b) => b.id === id ? { ...b, status: approve ? "Awaiting payment" : "Declined" } : b));
    setNotice(approve ? "Request approved. A 15-minute test payment reservation is active." : "Request declined. The client has been notified.");
  }
  function reviewChange(id: number | string, approve: boolean, kind: "Cancellation requested" | "Reschedule requested") {
    if (typeof id !== "string") return;
    startBooking(async () => {
      const result = kind === "Cancellation requested" ? await decideCancellation(id, approve) : await decideReschedule(id, approve);
      if (result.error) { setNotice(result.error); return; }
      setBookings((rows) => rows.map((b) => b.id === id ? { ...b, status: kind === "Cancellation requested" && approve ? "Cancelled" : "Confirmed" } : b));
      setNotice(result.success || "Booking updated.");
    });
  }
  function submitBooking() {
    if (!address.trim()) { setNotice("Add your appointment address to continue."); return; }
    if (!selectedDate || !time || !chosenArea) { setNotice("Choose an available date, time, and travel area."); return; }
    setBookingError("");
    setModal(true);
  }
  function chooseGlamMood(moodId: string) {
    const mood = glamMoods.find((item) => item.id === moodId);
    if (!mood) return;
    setSelectedMood(moodId);
    const match = serviceOptions.findIndex((service) => mood.keywords.some((keyword) => `${service.name} ${service.description}`.toLowerCase().includes(keyword)));
    if (match >= 0) setSelected(match);
  }
  async function shareBookingPage() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `${artist?.business_name || "Studio Sola"} on BeatBook`, url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice("Booking page link copied. Share it with someone who’d love a little glam.");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") setNotice("Couldn’t share the link. Copy it from your browser’s address bar.");
    }
  }
  function confirmRequest() {
    if (!artist || chosen.id.startsWith("demo-") || chosenArea.id.startsWith("demo-")) {
      setBookingError("This is a preview booking page. Publish a studio profile and services to accept real requests.");
      return;
    }
    const payload = new FormData();
    payload.set("artist_id", artist.id);
    payload.set("service_id", chosen.id);
    payload.set("travel_area_id", chosenArea.id);
    payload.set("appointment_start", `${selectedDate}T${time}`);
    payload.set("full_address", address);
    startBooking(async () => {
      const result = await createBookingRequest({}, payload);
      if (result.error) { setBookingError(result.error); return; }
      setModal(false);
      setNotice(result.success || "Your request was sent.");
    });
  }

  return <main className="app-shell">
    {view === "dashboard" && <header className="topbar">
      <button className="brand" onClick={() => setView("dashboard")} aria-label="BeatBook home"><span className="brand-mark">b.</span><span>beatbook</span></button>
      <div className="top-center"><span className="live-dot"/> Your beauty, beautifully booked</div>
      <div className="top-actions">{allowSwitch && <button className="view-switch" onClick={() => { setView(view === "dashboard" ? "book" : "dashboard"); setNotice(""); }}><span>◉</span> {view === "dashboard" ? "Client preview" : "Artist dashboard"} <span>↗</span></button>}<button className="avatar" aria-label="Open settings" title="Open settings" onClick={() => { setView("dashboard"); setActiveNav("Settings"); }}>S</button></div>
    </header>}

    {view === "dashboard" ? <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="workspace-label">YOUR STUDIO</div><div className="artist-mini"><div className="artist-avatar">{(studioName || "S")[0]}</div><div><strong>{studioName || "Your studio"}</strong><span>Independent artist</span></div></div>
        <nav className="side-nav" aria-label="Artist dashboard">
          {navItems.map((item, i) => <button key={item} className={activeNav === item ? "nav-item active" : "nav-item"} onClick={() => setActiveNav(item)}><span className="nav-icon">{["⌂", "▤", "▦", "✳", "⌖", "◇", "⚙"][i]}</span>{item}{item === "Bookings" && pending.length > 0 && <span className="nav-count">{pending.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="help-mark">?</div><span><strong>Need a hand?</strong><small>Visit our help center</small></span><span className="arrow">↗</span></div>
      </aside>

      <section className="main-panel">
        <div className="page-heading"><div><div className="eyebrow">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: studioTimezone }).format(new Date()).toUpperCase()}</div><h1>{activeNav === "Overview" ? `${greeting}, ${(studioName || "there").split(" ")[0]}` : activeNav} <span className="wave">✳</span></h1><p>{headingCopy}</p></div><div className="heading-actions"><button className="icon-button" aria-label="Open bookings" title="Open bookings" onClick={() => setActiveNav("Bookings")}>♧<i/></button><button className="button secondary" onClick={() => setView("book")}>View booking page <span>↗</span></button></div></div>
        {notice && <div className="notice"><span>✓</span>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
        {activeNav === "Overview" ? <>
        <div className="metric-grid">
          <article className="metric-card"><div className="metric-top"><span>Appointments today</span><span className="metric-icon blush">✳</span></div><div className="metric-value">{today}</div><div className="metric-foot">Confirmed for today</div></article>
          <article className="metric-card"><div className="metric-top"><span>Pending requests</span><span className="metric-icon amber">◷</span></div><div className="metric-value">{pending.length}<small className="attention">Needs your attention</small></div><div className="metric-foot">Requests expire after 24 hours</div></article>
          <article className="metric-card"><div className="metric-top"><span>Upcoming appointments</span><span className="metric-icon lavender">▦</span></div><div className="metric-value">{upcomingBookings.length}</div><div className="metric-foot">Confirmed and awaiting deposit</div></article>
          <article className="metric-card revenue"><div className="metric-top"><span>Confirmed value</span><span className="metric-icon green">₦</span></div><div className="metric-value">₦{confirmedValue.toLocaleString()}</div><div className="metric-foot">Total value of confirmed appointments</div></article>
        </div>

        <div className="content-grid">
          <div className="left-column">
            <section className="card booking-card"><div className="section-head"><div><h2>Booking requests <span className="pill-count">{pending.length}</span></h2><p>Review and respond to new requests</p></div><button className="text-link" onClick={() => setActiveNav("Bookings")}>View all <span>→</span></button></div>
              {pending.length ? pending.map((b) => <div className="request-row" key={b.id}><div className="client-photo">{b.client.split(" ").map(n => n[0]).join("")}</div><div className="request-info"><div className="client-line"><strong>{b.client}</strong><span className="status amber-status">{b.status}</span></div><div className="request-details">{b.service} <span>·</span> {b.date} at {b.time}</div><div className="request-meta">⌖ {b.area} <span>·</span> ₦{b.amount.toLocaleString()}</div></div><div className="request-actions">{b.status === "Pending approval" ? <><button className="quiet-button" onClick={() => setNotice(`Details for ${b.client}: ${b.service}, ${b.date} at ${b.time}.`)}>Review</button><button className="approve-button" disabled={bookingPending} onClick={() => decide(b.id, true)}>Approve</button><button className="decline-button" disabled={bookingPending} onClick={() => decide(b.id, false)} aria-label="Decline request">×</button></> : <><button className="quiet-button" disabled={bookingPending} onClick={() => reviewChange(b.id, false, b.status as "Cancellation requested" | "Reschedule requested")}>Decline</button><button className="approve-button" disabled={bookingPending} onClick={() => reviewChange(b.id, true, b.status as "Cancellation requested" | "Reschedule requested")}>Approve</button></>}</div></div>) : <div className="empty-state">All caught up. New requests will appear here.</div>}
            </section>
            <section className="card appointments-card"><div className="section-head"><div><h2>Upcoming appointments</h2><p>Your next few bookings</p></div><button className="select-small" onClick={() => setActiveNav("Calendar")}>Open calendar →</button></div>
              <div className="appointment-head"><span>CLIENT</span><span>DATE & TIME</span><span>SERVICE</span><span>STATUS</span></div>
              {upcomingBookings.slice(0, 4).map((b, i) => <div className="appointment-row" key={b.id}><div className="appointment-client"><span className={`tiny-avatar tone-${i % 4}`}>{b.client[0]}</span><strong>{b.client}</strong></div><div>{b.date}<small>{b.time}</small></div><div>{b.service}</div><div><span className={`status ${b.status === "Confirmed" ? "green-status" : "blue-status"}`}>{b.status}</span></div></div>)}
              {!upcomingBookings.length && <div className="empty-state">No upcoming appointments yet. Approved bookings will appear here.</div>}
            </section>
          </div>
          <aside className="right-column">
            <section className="card calendar-card"><div className="section-head"><div><h2>Your calendar</h2><p>{monthLabel}</p></div><div className="calendar-controls"><button aria-label="Previous month" onClick={() => setMonthAnchor(new Date(calendarYear, calendarMonth - 1, 1))}>‹</button><button aria-label="Next month" onClick={() => setMonthAnchor(new Date(calendarYear, calendarMonth + 1, 1))}>›</button></div></div><div className="calendar-grid"><div className="weekday">M</div><div className="weekday">T</div><div className="weekday">W</div><div className="weekday">T</div><div className="weekday">F</div><div className="weekday">S</div><div className="weekday">S</div>{monthDays.map((d, i) => { const key = d ? `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` : ""; return <button key={i} disabled={!d} className={`calendar-day ${key === todayKey ? "today" : ""} ${bookings.some((b) => b.dateKey === key && ["Confirmed", "Awaiting payment", "Pending approval", "Cancellation requested", "Reschedule requested"].includes(b.status)) ? "has-event" : ""}`} onClick={() => { if (key) { setCalendarFocusDate(key); setActiveNav("Calendar"); } }}>{d}</button>; })}</div><div className="calendar-legend"><span><i className="legend-dot plum-dot"/> Appointment</span><span><i className="legend-dot gray-dot"/> Today</span></div></section>
            <section className="setup-card"><div className="setup-header"><div className="setup-icon">✳</div><span>STUDIO SHORTCUT</span></div><h3>Keep your page polished</h3><p>Update your profile, services, hours, and travel areas whenever things change.</p><Link className="setup-action" href="/onboarding">Edit studio details <span>→</span></Link></section>
            <section className="tip-card"><span className="tip-icon">✧</span><div><strong>See your booking page</strong><p>Check the details and services your clients see before they book.</p><button onClick={() => setView("book")}>Preview booking page <span>→</span></button></div></section>
          </aside>
        </div>
        <footer className="footer"><span>© {new Date().getFullYear()} BeatBook</span><span>Made for artists, with love <b>♥</b></span><span>Help&nbsp;&nbsp; · &nbsp;&nbsp;Privacy&nbsp;&nbsp; · &nbsp;&nbsp;Terms</span></footer>
        </> : <DashboardWorkspace section={activeNav} bookings={bookings} services={dashboardServices} areas={dashboardAreas} policy={dashboardPolicy} businessName={studioName || ""} businessLocation={studioLocation || ""} timezone={studioTimezone} bookingSlug={bookingSlug} contactEmail={contactEmail} initialDate={calendarFocusDate} onDecide={decide} onReviewChange={reviewChange} pending={bookingPending} />}
      </section>
    </div> : <div className="booking-page" ref={bookingMotionRoot}>
      <header className="booking-header">{allowSwitch && <button className="back-link" onClick={() => setView("dashboard")}>← <span>Back to dashboard</span></button>}<div className="client-brand"><span className="brand-mark">b.</span> beatbook</div><span className="secure-label">✦ &nbsp;A BEAUTY APPOINTMENT, MADE EASY</span></header>
      <div className="booking-intro"><div className="booking-intro-copy"><span className="eyebrow">MEET YOUR ARTIST</span><h1>Make room for a little <em>magic.</em></h1><p>Book your next beautiful moment with {artist?.business_name || "your artist"}.</p></div><div className="booking-hero-image" role="img" aria-label="A makeup artist getting a client ready for a beauty appointment" style={{ backgroundImage: `url("${artist?.profile_image_url || heroPhoto}")` }}><span>YOUR MOMENT, YOUR WAY</span></div></div>
      {notice && <div className="notice booking-notice"><span>✓</span>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
      <div className="booking-layout"><div className="booking-main">
        <section className="booking-section artist-card"><div className="artist-portrait" style={artist?.profile_image_url ? { backgroundImage: `url("${artist.profile_image_url}")`, backgroundSize: "cover", backgroundPosition: "center", color: "transparent" } : undefined}>{artist?.business_name?.[0] || "S"}<span className="portrait-flower">✿</span></div><div><span className="verified-label">BEAUTY PROFESSIONAL</span><h2>{artist?.business_name || "Studio Sola"}</h2><p>Makeup artist · {artist?.business_location || "Lagos, Nigeria"}</p></div><button className="share-button" aria-label="Share booking page" title="Share booking page" onClick={shareBookingPage}>↗</button></section>
        <section className="booking-section glam-finder-section"><div className="booking-step"><span>✦</span><div><h2>The Glam Moodboard</h2><p>Pick your energy and we’ll find a service to match.</p></div><span className="glam-edition">YOUR GIRLIE MOMENT</span></div><div className="glam-mood-grid">{glamMoods.map((mood, i) => <button key={mood.id} aria-pressed={selectedMood === mood.id} className={`glam-mood-card glam-mood-${i} ${selectedMood === mood.id ? "glam-mood-selected" : ""}`} style={{ backgroundImage: `linear-gradient(180deg, #24162110 15%, #241621c9 100%), url("${servicePhotos[i % servicePhotos.length]}")` }} onClick={() => chooseGlamMood(mood.id)}><span className="glam-mood-icon">{mood.icon}</span><span className="glam-mood-copy"><strong>{mood.name}</strong><small>{mood.note}</small></span><span className="glam-mood-check">✓</span></button>)}</div>{selectedMood && <div className="glam-recommendation"><span className="glam-recommendation-spark">✦</span><div><small>YOUR VIBE, YOUR LOOK</small><strong>{chosen.name}</strong><span>We picked this service to match your mood. You can change it below.</span></div><button onClick={() => document.getElementById("service-options")?.scrollIntoView({ behavior: "smooth", block: "center" })}>See service <span>↓</span></button></div>}</section>
        <section id="service-options" className="booking-section"><div className="booking-step"><span>01</span><div><h2>Choose your service</h2><p>Find the look that feels like you.</p></div></div><div className="service-grid">{serviceOptions.map((service, i) => <button className={`service-card ${selected === i ? "selected" : ""}`} key={service.id} onClick={() => { setSelected(i); setTime(""); }}><div className={`service-art art-${i % 3}`} style={{ backgroundImage: `linear-gradient(180deg, #25162212, #25162266), url("${servicePhotos[i % servicePhotos.length]}")` }}><span>{service.icon}</span>{service.tag && <i>{service.tag}</i>}</div><div className="service-copy"><h3>{service.name}</h3><p>{service.description}</p><div className="service-meta"><strong>₦{service.price_ngn.toLocaleString()}</strong><span>◷ {durationLabel(service.duration_minutes)}</span></div></div>{selected === i && <span className="selected-check">✓</span>}</button>)}</div></section>
        <section className="booking-section"><div className="booking-step"><span>02</span><div><h2>Pick a date & time</h2><p>Choose a moment that works for you.</p></div></div><div className="date-panel"><div className="date-month"><button aria-label="Previous month" onClick={() => setMonthAnchor(new Date(calendarYear, calendarMonth - 1, 1))}>‹</button><strong>{monthLabel}</strong><button aria-label="Next month" onClick={() => setMonthAnchor(new Date(calendarYear, calendarMonth + 1, 1))}>›</button></div><div className="date-grid"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>{monthDays.map((d, i) => { const dateString = d ? `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` : ""; return <button key={i} disabled={!d || dateString < todayLocal} className={`${dateString === selectedDate ? "chosen-day" : ""} ${dateString === todayLocal ? "today-date" : ""}`} onClick={() => { if (dateString) { setSelectedDate(dateString); setTime(""); } }}>{d}</button>; })}</div><div className="time-label">AVAILABLE TIMES <span>{artist?.timezone || "Africa/Lagos"}</span></div><div className="time-options">{availableTimes.map((t) => <button className={time === t ? "time-selected" : ""} key={t} onClick={() => setTime(t)}>{displayTime(t)}</button>)}{availableTimes.length === 0 && <span className="no-times">No times available for this date.</span>}</div></div></section>
        <section className="booking-section"><div className="booking-step"><span>03</span><div><h2>Where should we meet?</h2><p>Your details help us make the day seamless.</p></div></div><label className="field-label">APPOINTMENT ADDRESS<input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address, building, or landmark" /></label><label className="field-label">YOUR AREA<select value={area} onChange={(e) => setArea(e.target.value)}>{areaOptions.map((option) => <option key={option.id} value={option.id}>{option.name} · ₦{option.fee_ngn.toLocaleString()}</option>)}</select><small>Travel fees vary by area. No hidden charges.</small></label></section>
        <div className="policy-note"><span>♡</span><p><strong>A note from {artist?.business_name || "Studio Sola"}</strong><br/>{depositPercent}% deposit secures your appointment after the artist approves your request. {cancellationTerms || "Cancellations are accepted up to 48 hours before your booking."}</p></div>
      </div>
      <aside className="booking-aside"><div className="summary-card"><span className="eyebrow">YOUR APPOINTMENT</span><h2>A little look at the details.</h2><div className="summary-service"><span className="summary-flower">{chosen.icon}</span><div><strong>{chosen.name}</strong><span>{durationLabel(chosen.duration_minutes)} · {artist?.business_name || "Studio Sola"}</span></div><strong>₦{chosen.price_ngn.toLocaleString()}</strong></div><div className="summary-date"><span>▦</span><div><strong>{prettySelectedDate} · {time ? displayTime(time) : "Choose a time"}</strong><small>{artist?.timezone || "Africa/Lagos"}</small></div></div><div className="summary-line"><span>Service</span><strong>₦{chosen.price_ngn.toLocaleString()}</strong></div><div className="summary-line"><span>Travel · {chosenArea?.name}</span><strong>₦{travelFee.toLocaleString()}</strong></div><div className="summary-total"><span>Total</span><strong>₦{total.toLocaleString()}</strong></div><div className="deposit-line"><span>Deposit to secure</span><strong>₦{deposit.toLocaleString()}</strong></div><div className="balance-line"><span>Remaining after deposit</span><span>₦{(total - deposit).toLocaleString()}</span></div><button className="button primary request-button" onClick={submitBooking}>Request this appointment <span>→</span></button><p className="no-charge">No payment is taken until your artist approves.</p><div className="secure-line">♡ &nbsp;Your details are always kept private</div></div><div className="aside-help"><span>Need a little help?</span><button onClick={() => setNotice(`Contact ${artist?.business_name || "your artist"} at ${artist?.contact_email || "their listed email"}`)}>Ask your artist ↗</button></div></aside></div>
      <footer className="booking-footer"><span>© {new Date().getFullYear()} BeatBook</span><span>Beauty bookings, beautifully organized.</span><span>Privacy · Terms · Help</span></footer>
    </div>}

    {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(false); }}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><button className="modal-close" onClick={() => setModal(false)}>×</button><div className="modal-flower">✿</div><span className="eyebrow">ONE LAST THING</span><h2 id="confirm-title">Let’s send your request.</h2><p>{artist?.business_name || "Studio Sola"} will review your appointment and get back to you within 24 hours. You won’t be charged now.</p><div className="modal-detail"><span>{chosen.name} · {prettySelectedDate} at {time ? displayTime(time) : "Choose a time"}</span><strong>₦{total.toLocaleString()} total</strong></div>{bookingError && <p className="auth-error" role="alert">{bookingError}{bookingError.startsWith("Sign in") && <> <Link href={`/sign-in?next=${encodeURIComponent(`/book/${artist?.booking_slug || ""}`)}`}>Sign in</Link> or <Link href="/sign-up">create an account</Link>.</>}</p>}<button className="button primary" onClick={confirmRequest} disabled={bookingPending}>{bookingPending ? "Sending request…" : "Send booking request"} <span>→</span></button><button className="modal-cancel" onClick={() => setModal(false)}>I’d like to make a change</button><small>Deposit of ₦{deposit.toLocaleString()} only after approval · Simulated payments only</small></section></div>}
  </main>;
}

