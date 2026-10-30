"use client";

import { useActionState } from "react";
import { saveArtistProfile, type OnboardingState } from "@/app/onboarding/actions";

type InitialProfile = { business_name?: string; booking_slug?: string; description?: string; contact_email?: string; phone?: string | null; business_location?: string; timezone?: string };

export default function ArtistProfileForm({ initial, email }: { initial: InitialProfile | null; email: string }) {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(saveArtistProfile, {});
  return <form action={formAction} className="studio-form">
    <div className="studio-form-grid">
      <label className="field-label">STUDIO OR PROFESSIONAL NAME<input name="business_name" defaultValue={initial?.business_name || ""} placeholder="e.g. Studio Sola" required minLength={2} /></label>
      <label className="field-label">BOOKING PAGE LINK<div className="slug-field"><span>beatbook.app/</span><input name="booking_slug" defaultValue={initial?.booking_slug || ""} placeholder="your-studio" required /></div><small>Use lowercase letters, numbers, and hyphens.</small></label>
      <label className="field-label studio-wide">YOUR INTRODUCTION<textarea name="description" defaultValue={initial?.description || ""} placeholder="Tell clients a little about your style and what makes your studio special." minLength={20} maxLength={500} rows={4} required /><small>Required to publish · 20–500 characters.</small></label>
      <label className="field-label">CONTACT EMAIL<input type="email" name="contact_email" defaultValue={initial?.contact_email || email} required /></label>
      <label className="field-label">PHONE NUMBER <span className="optional-label">OPTIONAL</span><input name="phone" type="tel" defaultValue={initial?.phone || ""} placeholder="+234 800 000 0000" /></label>
      <label className="field-label">BUSINESS LOCATION<input name="business_location" defaultValue={initial?.business_location || "Lagos, Nigeria"} required /></label>
      <label className="field-label">TIME ZONE<select name="timezone" defaultValue={initial?.timezone || "Africa/Lagos"}><option value="Africa/Lagos">Africa/Lagos (WAT)</option><option value="Africa/Accra">Africa/Accra (GMT)</option><option value="Europe/London">Europe/London</option><option value="America/New_York">America/New_York</option></select></label>
    </div>
    {state.error && <p className="auth-error" role="alert">{state.error}</p>}
    {state.success && <p className="auth-success" role="status">{state.success}</p>}
    <div className="studio-form-actions"><span>Changes save to your private studio profile.</span><button className="button primary" disabled={pending}>{pending ? "Saving…" : "Save and continue"}<span>→</span></button></div>
  </form>;
}

