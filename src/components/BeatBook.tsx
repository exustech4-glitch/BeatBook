"use client";

import { useMemo, useState } from "react";

type Status = "Pending approval" | "Confirmed" | "Awaiting payment" | "Declined";
type Booking = { id: number; client: string; service: string; date: string; time: string; area: string; status: Status; amount: number };
const initialBookings: Booking[] = [
  { id: 1, client: "Amara Okafor", service: "Bridal makeup", date: "May 20, 2025", time: "10:00 AM", area: "Ikoyi", status: "Confirmed", amount: 160 },
  { id: 2, client: "Tomi Adebayo", service: "Party makeup", date: "May 22, 2025", time: "1:00 PM", area: "Lekki Phase 1", status: "Pending approval", amount: 130 },
  { id: 3, client: "Nneka Obi", service: "Engagement makeup", date: "May 25, 2025", time: "2:00 PM", area: "Victoria Island", status: "Pending approval", amount: 145 },
];
const services = [
  { name: "Bridal makeup", description: "Your moment, made unforgettable.", duration: "2 hours", price: 150, tag: "MOST LOVED", icon: "✳" },
  { name: "Party makeup", description: "A little extra for your next big night.", duration: "1.5 hours", price: 120, tag: "", icon: "✺" },
  { name: "Engagement makeup", description: "Soft glam for the start of forever.", duration: "2 hours", price: 130, tag: "", icon: "♡" },
];
const navItems = ["Overview", "Bookings", "Calendar", "Services", "Travel areas", "Deposits & policies", "Settings"];

export default function BeatBook({ initialView = "dashboard", allowSwitch = true }: { initialView?: "dashboard" | "book"; allowSwitch?: boolean }) {
  const [view, setView] = useState<"dashboard" | "book">(initialView);
  const [activeNav, setActiveNav] = useState("Overview");
  const [bookings, setBookings] = useState(initialBookings);
  const [selected, setSelected] = useState(0);
  const [day, setDay] = useState(15);
  const [time, setTime] = useState("10:00 AM");
  const [area, setArea] = useState("Ikoyi");
  const [address, setAddress] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(false);
  const chosen = services[selected];
  const travelFee = area === "Ikoyi" ? 10 : area === "Lekki Phase 1" ? 15 : 20;
  const total = chosen.price + travelFee;
  const deposit = Math.round(total * 0.25);
  const pending = bookings.filter((b) => b.status === "Pending approval");
  const today = bookings.filter((b) => b.status === "Confirmed").length;
  const monthDays = useMemo(() => Array.from({ length: 35 }, (_, i) => i < 3 ? null : i - 2 <= 31 ? i - 2 : null), []);

  function decide(id: number, approve: boolean) {
    setBookings((rows) => rows.map((b) => b.id === id ? { ...b, status: approve ? "Awaiting payment" : "Declined" } : b));
    setNotice(approve ? "Request approved. A 15-minute test payment reservation is active." : "Request declined. The client has been notified.");
  }
  function submitBooking() {
    if (!address.trim()) { setNotice("Add your appointment address to continue."); return; }
    setModal(true);
  }
  function confirmRequest() {
    const item: Booking = { id: Date.now(), client: "You", service: chosen.name, date: `May ${day}, 2025`, time, area, status: "Pending approval", amount: total };
    setBookings((rows) => [item, ...rows]);
    setModal(false);
    setNotice("Request sent. You’ll hear back from the artist soon.");
    setView("book");
  }

  return <main className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => setView("dashboard")} aria-label="BeatBook home"><span className="brand-mark">b.</span><span>beatbook</span></button>
      <div className="top-center"><span className="live-dot"/> Your beauty, beautifully booked</div>
      <div className="top-actions">{allowSwitch && <button className="view-switch" onClick={() => { setView(view === "dashboard" ? "book" : "dashboard"); setNotice(""); }}><span>◉</span> {view === "dashboard" ? "Client preview" : "Artist dashboard"} <span>↗</span></button>}<button className="avatar" aria-label="Account menu">S</button></div>
    </header>

    {view === "dashboard" ? <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="workspace-label">YOUR STUDIO</div><div className="artist-mini"><div className="artist-avatar">S</div><div><strong>Studio Sola</strong><span>Makeup artist <i className="verified">✓</i></span></div><span className="dots">•••</span></div>
        <nav className="side-nav" aria-label="Artist dashboard">
          {navItems.map((item, i) => <button key={item} className={activeNav === item ? "nav-item active" : "nav-item"} onClick={() => setActiveNav(item)}><span className="nav-icon">{["⌂", "▤", "▦", "✳", "⌖", "◇", "⚙"][i]}</span>{item}{item === "Bookings" && pending.length > 0 && <span className="nav-count">{pending.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="help-mark">?</div><span><strong>Need a hand?</strong><small>Visit our help center</small></span><span className="arrow">↗</span></div>
      </aside>

      <section className="main-panel">
        <div className="page-heading"><div><div className="eyebrow">TUESDAY, MAY 20, 2025</div><h1>Good morning, Sola <span className="wave">✳</span></h1><p>Here’s what’s happening at your studio today.</p></div><div className="heading-actions"><button className="icon-button" aria-label="Notifications">♧<i/></button><button className="button secondary" onClick={() => setView("book")}>View booking page <span>↗</span></button></div></div>
        {notice && <div className="notice"><span>✓</span>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
        <div className="metric-grid">
          <article className="metric-card"><div className="metric-top"><span>Appointments today</span><span className="metric-icon blush">✳</span></div><div className="metric-value">{today}<small className="trend">↗ 2 this week</small></div><div className="metric-foot">You’re right on schedule</div></article>
          <article className="metric-card"><div className="metric-top"><span>Pending requests</span><span className="metric-icon amber">◷</span></div><div className="metric-value">{pending.length}<small className="attention">Needs your attention</small></div><div className="metric-foot">Requests expire after 24 hours</div></article>
          <article className="metric-card"><div className="metric-top"><span>Upcoming this week</span><span className="metric-icon lavender">▦</span></div><div className="metric-value">8<small className="trend">↗ 3 new</small></div><div className="metric-foot">Your calendar is filling up</div></article>
          <article className="metric-card revenue"><div className="metric-top"><span>Deposits received</span><span className="metric-icon green">₦</span></div><div className="metric-value">₦{(today * 40000).toLocaleString()}<small className="trend">This month</small></div><div className="metric-foot">From confirmed appointments</div></article>
        </div>

        <div className="content-grid">
          <div className="left-column">
            <section className="card booking-card"><div className="section-head"><div><h2>Booking requests <span className="pill-count">{pending.length}</span></h2><p>Review and respond to new requests</p></div><button className="text-link" onClick={() => setActiveNav("Bookings")}>View all <span>→</span></button></div>
              {pending.length ? pending.map((b) => <div className="request-row" key={b.id}><div className="client-photo">{b.client.split(" ").map(n => n[0]).join("")}</div><div className="request-info"><div className="client-line"><strong>{b.client}</strong><span className="status amber-status">{b.status}</span></div><div className="request-details">{b.service} <span>·</span> {b.date} at {b.time}</div><div className="request-meta">⌖ {b.area} <span>·</span> ₦{b.amount.toLocaleString()}</div></div><div className="request-actions"><button className="quiet-button" onClick={() => setNotice(`Details for ${b.client}: ${b.service}, ${b.date} at ${b.time}.`)}>Review</button><button className="approve-button" onClick={() => decide(b.id, true)}>Approve</button><button className="decline-button" onClick={() => decide(b.id, false)} aria-label="Decline request">×</button></div></div>) : <div className="empty-state">All caught up. New requests will appear here.</div>}
            </section>
            <section className="card appointments-card"><div className="section-head"><div><h2>Upcoming appointments</h2><p>Your next few bookings</p></div><button className="select-small" onClick={() => setActiveNav("Calendar")}>This week⌄</button></div>
              <div className="appointment-head"><span>CLIENT</span><span>DATE & TIME</span><span>SERVICE</span><span>STATUS</span></div>
              {bookings.slice(0, 4).map((b, i) => <div className="appointment-row" key={b.id}><div className="appointment-client"><span className={`tiny-avatar tone-${i % 4}`}>{b.client[0]}</span><strong>{b.client}</strong></div><div>{b.date}<small>{b.time}</small></div><div>{b.service}</div><div><span className={`status ${b.status === "Confirmed" ? "green-status" : b.status === "Pending approval" ? "amber-status" : "blue-status"}`}>{b.status}</span></div></div>)}
            </section>
          </div>
          <aside className="right-column">
            <section className="card calendar-card"><div className="section-head"><div><h2>Your calendar</h2><p>May 2025</p></div><div className="calendar-controls"><button aria-label="Previous month">‹</button><button aria-label="Next month">›</button></div></div><div className="calendar-grid"><div className="weekday">M</div><div className="weekday">T</div><div className="weekday">W</div><div className="weekday">T</div><div className="weekday">F</div><div className="weekday">S</div><div className="weekday">S</div>{monthDays.map((d, i) => <button key={i} className={`calendar-day ${d === 20 ? "today" : ""} ${d === 22 || d === 25 ? "has-event" : ""}`}>{d}</button>)}</div><div className="calendar-legend"><span><i className="legend-dot plum-dot"/> Appointment</span><span><i className="legend-dot gray-dot"/> Today</span></div></section>
            <section className="setup-card"><div className="setup-header"><div className="setup-icon">✳</div><span>YOUR STUDIO</span><span className="setup-progress">4/5</span></div><h3>Almost ready to shine</h3><p>Complete your setup to start receiving bookings.</p><div className="progress-track"><i/></div><div className="progress-label"><span>Profile & services</span><strong>80%</strong></div><button className="setup-action" onClick={() => setActiveNav("Services")}>Continue setup <span>→</span></button></section>
            <section className="tip-card"><span className="tip-icon">✧</span><div><strong>A little studio tip</strong><p>Profiles with a photo get 2× more booking requests. Add yours to stand out.</p><button onClick={() => setActiveNav("Settings")}>Update your profile <span>→</span></button></div></section>
          </aside>
        </div>
        <footer className="footer"><span>© 2025 BeatBook</span><span>Made for artists, with love <b>♥</b></span><span>Help&nbsp;&nbsp; · &nbsp;&nbsp;Privacy&nbsp;&nbsp; · &nbsp;&nbsp;Terms</span></footer>
      </section>
    </div> : <div className="booking-page">
      <header className="booking-header"><button className="back-link" onClick={() => allowSwitch ? setView("dashboard") : (window.location.href = "/")}>← <span>{allowSwitch ? "Back to dashboard" : "Back to BeatBook"}</span></button><div className="client-brand"><span className="brand-mark">b.</span> beatbook</div><span className="secure-label">✦ &nbsp;A BEAUTY APPOINTMENT, MADE EASY</span></header>
      <div className="booking-intro"><span className="eyebrow">MEET YOUR ARTIST</span><h1>Make room for a little <em>magic.</em></h1><p>Book your next beautiful moment with Studio Sola.</p></div>
      {notice && <div className="notice booking-notice"><span>✓</span>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
      <div className="booking-layout"><div className="booking-main">
        <section className="booking-section artist-card"><div className="artist-portrait">S<span className="portrait-flower">✿</span></div><div><span className="verified-label">✦ VERIFIED ARTIST</span><h2>Studio Sola</h2><p>Makeup artist · Lagos, Nigeria</p><div className="artist-rating">★★★★★ <span>4.9 <i>(38 reviews)</i></span></div></div><button className="share-button" aria-label="Share artist">↗</button></section>
        <section className="booking-section"><div className="booking-step"><span>01</span><div><h2>Choose your service</h2><p>Find the look that feels like you.</p></div></div><div className="service-grid">{services.map((service, i) => <button className={`service-card ${selected === i ? "selected" : ""}`} key={service.name} onClick={() => setSelected(i)}><div className={`service-art art-${i}`}><span>{service.icon}</span>{service.tag && <i>{service.tag}</i>}</div><div className="service-copy"><h3>{service.name}</h3><p>{service.description}</p><div className="service-meta"><strong>₦{service.price.toLocaleString()}</strong><span>◷ {service.duration}</span></div></div>{selected === i && <span className="selected-check">✓</span>}</button>)}</div></section>
        <section className="booking-section"><div className="booking-step"><span>02</span><div><h2>Pick a date & time</h2><p>Choose a moment that works for you.</p></div></div><div className="date-panel"><div className="date-month"><button aria-label="Previous month">‹</button><strong>May 2025</strong><button aria-label="Next month">›</button></div><div className="date-grid"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>{monthDays.slice(0, 35).map((d, i) => <button key={i} disabled={!d || d < 20 || d === 24 || d === 25 || d === 31} className={`${d === day ? "chosen-day" : ""} ${d === 20 ? "today-date" : ""}` } onClick={() => d && setDay(d)}>{d}</button>)}</div><div className="time-label">AVAILABLE TIMES <span>Lagos time (WAT)</span></div><div className="time-options">{["10:00 AM", "1:00 PM", "4:00 PM"].map((t) => <button className={time === t ? "time-selected" : ""} key={t} onClick={() => setTime(t)}>{t}</button>)}</div></div></section>
        <section className="booking-section"><div className="booking-step"><span>03</span><div><h2>Where should we meet?</h2><p>Your details help us make the day seamless.</p></div></div><label className="field-label">APPOINTMENT ADDRESS<input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address, building, or landmark" /></label><label className="field-label">YOUR AREA<select value={area} onChange={(e) => setArea(e.target.value)}><option>Ikoyi</option><option>Lekki Phase 1</option><option>Victoria Island</option></select><small>Travel fees vary by area. No hidden charges.</small></label></section>
        <div className="policy-note"><span>♡</span><p><strong>A note from Studio Sola</strong><br/>A 25% deposit secures your appointment after the artist approves your request. Cancellations are accepted up to 48 hours before your booking.</p></div>
      </div>
      <aside className="booking-aside"><div className="summary-card"><span className="eyebrow">YOUR APPOINTMENT</span><h2>A little look at the details.</h2><div className="summary-service"><span className="summary-flower">{chosen.icon}</span><div><strong>{chosen.name}</strong><span>{chosen.duration} · Studio Sola</span></div><strong>₦{chosen.price.toLocaleString()}</strong></div><div className="summary-date"><span>▦</span><div><strong>May {day}, 2025 · {time}</strong><small>Tuesday · Lagos time</small></div></div><div className="summary-line"><span>Service</span><strong>₦{chosen.price.toLocaleString()}</strong></div><div className="summary-line"><span>Travel · {area}</span><strong>₦{travelFee.toLocaleString()}</strong></div><div className="summary-total"><span>Total</span><strong>₦{total.toLocaleString()}</strong></div><div className="deposit-line"><span>Deposit to secure</span><strong>₦{deposit.toLocaleString()}</strong></div><div className="balance-line"><span>Remaining after deposit</span><span>₦{(total - deposit).toLocaleString()}</span></div><button className="button primary request-button" onClick={submitBooking}>Request this appointment <span>→</span></button><p className="no-charge">No payment is taken until your artist approves.</p><div className="secure-line">♡ &nbsp;Your details are always kept private</div></div><div className="aside-help"><span>Need a little help?</span><button onClick={() => setNotice("Contact Studio Sola at hello@studiosola.example")}>Ask your artist ↗</button></div></aside></div>
      <footer className="booking-footer"><span>© 2025 BeatBook</span><span>Beauty bookings, beautifully organized.</span><span>Privacy · Terms · Help</span></footer>
    </div>}

    {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(false); }}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><button className="modal-close" onClick={() => setModal(false)}>×</button><div className="modal-flower">✿</div><span className="eyebrow">ONE LAST THING</span><h2 id="confirm-title">Let’s send your request.</h2><p>Studio Sola will review your appointment and get back to you within 24 hours. You won’t be charged now.</p><div className="modal-detail"><span>{chosen.name} · May {day}, 2025 at {time}</span><strong>₦{total.toLocaleString()} total</strong></div><button className="button primary" onClick={confirmRequest}>Send booking request <span>→</span></button><button className="modal-cancel" onClick={() => setModal(false)}>I’d like to make a change</button><small>Deposit of ₦{deposit.toLocaleString()} only after approval · Test booking flow</small></section></div>}
  </main>;
}
