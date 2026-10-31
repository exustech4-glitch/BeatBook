"use client";

import { useActionState, useState } from "react";
import { publishArtistProfile, saveStudioSetup, type StudioSetupState } from "@/app/onboarding/studio-actions";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type TravelArea = { id?: string; name: string; fee_ngn: number };

export default function StudioSetupForm({ published, slug, initialAreas = [], areasLoadError = "" }: { published: boolean; slug: string; initialAreas?: TravelArea[]; areasLoadError?: string }) {
  const [state, formAction, pending] = useActionState<StudioSetupState, FormData>(saveStudioSetup, {});
  const [publishState, publishAction, publishing] = useActionState<StudioSetupState, FormData>(async () => publishArtistProfile(), {});
  const [areas, setAreas] = useState<TravelArea[]>(() => initialAreas.length ? initialAreas : [{ name: "", fee_ngn: 0 }]);
  return <section id="services" className="onboarding-card setup-extra-card">
    <div className="onboarding-card-head"><div><span className="eyebrow">STEPS 02–04 OF 04</span><h2>Services, schedule & policies</h2><p>Set the details clients need before they send a request.</p></div></div>
    <form action={formAction} className="studio-form">
      <div className="studio-form-grid">
        <label className="field-label">SERVICE NAME<input name="service_name" defaultValue="Bridal makeup" required /></label>
        <label className="field-label">PRICE (NGN)<input name="price_ngn" type="number" min="0" step="1" defaultValue="75000" required /></label>
        <label className="field-label">DURATION (MINUTES)<input name="duration_minutes" type="number" min="15" max="1440" step="15" defaultValue="120" required /></label>
        <label className="field-label">SERVICE DESCRIPTION<input name="service_description" placeholder="What should clients know?" /></label>
        <fieldset className="studio-wide travel-area-fields"><legend>TRAVEL AREAS & FEES</legend><p>Add each neighborhood you serve and set its travel fee.</p>{areas.map((area, index) => <div className="travel-area-row" key={area.id || index}><label className="field-label">AREA NAME<input name="area_name" value={area.name} onChange={(event) => setAreas((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="e.g. Ikoyi" required /></label><label className="field-label">TRAVEL FEE (NGN)<input name="travel_fee_ngn" type="number" min="0" step="1" value={area.fee_ngn} onChange={(event) => setAreas((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, fee_ngn: Number(event.target.value) } : item))} required /></label><button className="remove-area-button" type="button" aria-label={`Remove ${area.name || `travel area ${index + 1}`}`} onClick={() => setAreas((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={areas.length === 1}>Remove</button></div>)}<button className="button secondary add-area-button" type="button" onClick={() => setAreas((current) => [...current, { name: "", fee_ngn: 0 }])}>+ Add another area</button></fieldset>
        <label className="field-label">OPENING TIME<input name="opening_time" type="time" defaultValue="09:00" required /></label>
        <label className="field-label">CLOSING TIME<input name="closing_time" type="time" defaultValue="17:00" required /></label>
        <fieldset className="studio-wide weekdays-field"><legend>WORKING DAYS</legend><div>{days.map((day, index) => <label key={day}><input type="checkbox" name={`open_${index}`} defaultChecked={index > 0 && index < 6} /><span>{day.slice(0, 3)}</span></label>)}</div></fieldset>
        <label className="field-label">DEPOSIT (% OF TOTAL)<input name="deposit_percent" type="number" min="0" max="100" step="1" defaultValue="25" required /><small>Set 0 if you don’t require a deposit.</small></label>
        <label className="field-label">APPOINTMENT BUFFER (MINUTES)<input name="buffer_minutes" type="number" min="0" max="240" step="15" defaultValue="15" disabled /><small>Buffer changes can be set after this phase.</small></label>
        <label className="field-label studio-wide">CANCELLATION TERMS<textarea name="cancellation_terms" rows={3} defaultValue="Cancellations are accepted up to 48 hours before your appointment." /></label>
      </div>
      {areasLoadError && <p className="auth-error" role="alert">{areasLoadError}</p>}{state.error && <p className="auth-error" role="alert">{state.error}</p>}{state.success && <p className="auth-success" role="status">{state.success}</p>}
      <div className="studio-form-actions"><span>Fees and policies are saved as a version for future bookings.</span><button className="button primary" disabled={pending || !!areasLoadError}>{pending ? "Saving…" : "Save studio setup"}<span>→</span></button></div>
    </form>
    <form action={publishAction} className="publish-row">
      {publishState.error && <p className="auth-error" role="alert">{publishState.error}</p>}{publishState.success && <p className="auth-success" role="status">{publishState.success} <a href={`/book/${slug}`}>View booking page ↗</a></p>}
      {published ? <div className="published-state"><span>✓</span> Your booking page is published <a href={`/book/${slug}`}>Open page ↗</a></div> : <><p>First save the setup above. Publishing requires an introduction, an active service, working hours, a travel area, and a deposit policy.</p><button className="button primary" disabled={publishing}>{publishing ? "Publishing…" : "Review and publish"}<span>↗</span></button></>}
    </form>
  </section>;
}

