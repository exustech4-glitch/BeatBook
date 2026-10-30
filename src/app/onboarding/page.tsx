import Link from "next/link";
import { redirect } from "next/navigation";
import ArtistProfileForm from "@/components/ArtistProfileForm";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function OnboardingPage() {
  const user = await requireRole("ARTIST");
  const supabase = await createClient();
  const { data: profile, error } = await supabase.from("artist_profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (error && error.code !== "PGRST116") redirect("/sign-in?error=setup");

  return <main className="onboarding-page">
    <header className="onboarding-header"><Link className="auth-brand" href="/book"><span className="brand-mark">b.</span> beatbook</Link><form action={signOut}><button type="submit">Sign out</button></form></header>
    <div className="onboarding-wrap">
      <div className="onboarding-intro"><span className="eyebrow">YOUR STUDIO, YOUR WAY</span><h1>Let’s set the scene.</h1><p>First, tell us a little about your makeup business. You can save progress and finish your setup later.</p></div>
      <div className="stepper"><div className="step active"><span>1</span><strong>Business profile</strong></div><i/><div className="step"><span>2</span><strong>Services & prices</strong></div><i/><div className="step"><span>3</span><strong>Hours & travel</strong></div><i/><div className="step"><span>4</span><strong>Policies & publish</strong></div></div>
      <section className="onboarding-card"><div className="onboarding-card-head"><div><span className="eyebrow">STEP 01 OF 04</span><h2>Business profile</h2><p>This is what clients will see on your booking page.</p></div><span className="save-badge">Saved securely</span></div><ArtistProfileForm initial={profile} email={user.email} /></section>
      <p className="onboarding-foot">Your booking page stays private until you complete setup and publish it.</p>
    </div>
  </main>;
}
