"use client";

import { useActionState } from "react";
import { publishArtistProfile, saveStudioSetup, type StudioSetupState } from "@/app/onboarding/studio-actions";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function StudioSetupForm({ published, slug }: { published: boolean; slug: string }) {
  const [state, formAction, pending] = useActionState<StudioSetupState, FormData>(saveStudioSetup, {});
  const [publishState, publishAction, publishing] = useActionState<StudioSetupState, FormData>(async () => publishArtistProfile(), {});
  return <section id="services" className="onboarding-card setup-extra-card">
    <div className="onboarding-card-head"><div><span className="eyebrow">STEPS 02–04 OF 04</span><h2>Services, schedule & policies</h2><p>Set the details clients need before they send a request.</p></div></div>
    <form action={formAction} className="studio-form">
      <div className="studio-form-grid">
        <label className="field-label">SERVICE NAME<input name="service_name" defaultValue="Bridal makeup" required /></label>
        <label className="field-label">PRICE (NGN)<input name="price_ngn" type="number" min="0" step="1" defaultValue="75000" required /></label>
        <label className="field-label">DURATION (MINUTES)<input name="duration_minutes" type="number" min="15" max="1440" step="15" defaultValue="120" required /></label>
        <label className="field-label">SERVICE DESCRIPTION<input name="service_description" placeholder="What should clients know?" /></label>
        <label className="field-label">TRAVEL AREA<input name="area_name" defaultValue="Ikoyi" required /></label>
        <label className="field-label">TRAVEL FEE (NGN)<input name="travel_fee_ngn" type="number" min="0" step="1" defaultValue="5000" required /></label>
        <label className="field-label">OPENING TIME<input name="opening_time" type="time" defaultValue="09:00" required /></label>
        <label className="field-label">CLOSING TIME<input name="closing_time" type="time" defaultValue="17:00" required /></label>
        <fieldset className="studio-wide weekdays-field"><legend>WORKING DAYS</legend><div>{days.map((day, index) => <label key={day}><input type="checkbox" name={`open_${index}`} defaultChecked={index > 0 && index < 6} /><span>{day.slice(0, 3)}</span></label>)}</div></fieldset>
        <label className="field-label">DEPOSIT (% OF TOTAL)<input name="deposit_percent" type="number" min="0" max="100" step="1" defaultValue="25" required /><small>Set 0 if you don’t require a deposit.</small></label>
        <label className="field-label">APPOINTMENT BUFFER (MINUTES)<input name="buffer_minutes" type="number" min="0" max="240" step="15" defaultValue="15" disabled /><small>Buffer changes can be set after this phase.</small></label>
        <label className="field-label studio-wide">CANCELLATION TERMS<textarea name="cancellation_terms" rows={3} defaultValue="Cancellations are accepted up to 48 hours before your appointment." /></label>
      </div>
      {state.error && <p className="auth-error" role="alert">{state.error}</p>}{state.success && <p className="auth-success" role="status">{state.success}</p>}
      <div className="studio-form-actions"><span>Fees and policies are saved as a version for future bookings.</span><button className="button primary" disabled={pending}>{pending ? "Saving…" : "Save studio setup"}<span>→</span></button></div>
    </form>
    <form action={publishAction} className="publish-row">
      {publishState.error && <p className="auth-error" role="alert">{publishState.error}</p>}{publishState.success && <p className="auth-success" role="status">{publishState.success} <a href={`/book/${slug}`}>View booking page ↗</a></p>}
      {published ? <div className="published-state"><span>✓</span> Your booking page is published <a href={`/book/${slug}`}>Open page ↗</a></div> : <><p>Publishing makes your booking page visible to clients.</p><button className="button primary" disabled={publishing}>{publishing ? "Publishing…" : "Review and publish"}<span>↗</span></button></>}
    </form>
  </section>;
}

