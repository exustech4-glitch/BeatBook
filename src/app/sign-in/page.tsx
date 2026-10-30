import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  return <main className="auth-page auth-signin-page">
    <div className="auth-signin-top"><Link className="auth-brand" href="/book"><span className="brand-mark">b.</span> beatbook</Link><Link className="auth-back-link" href="/book">Back to booking page <span>↗</span></Link></div>
    <div className="auth-signin-layout">
      <section className="auth-visual-panel">
        <div className="auth-visual-copy"><span className="auth-visual-kicker">A BEAUTIFUL WAY TO WORK</span><h2>Your studio,<br/><em>in sync.</em></h2><p>Keep your bookings, clients, and schedule together in one calm workspace.</p></div>
        <div className="auth-dashboard-preview"><div className="auth-preview-head"><span><i/> Your artist workspace</span><b>BEATBOOK</b></div><div className="auth-preview-row"><span className="auth-preview-icon">▦</span><span><strong>Bookings</strong><small>Review requests and appointments</small></span><span className="auth-preview-arrow">↗</span></div><div className="auth-preview-row"><span className="auth-preview-icon">✳</span><span><strong>Services & schedule</strong><small>Keep your availability up to date</small></span><span className="auth-preview-arrow">↗</span></div><div className="auth-preview-row"><span className="auth-preview-icon">♡</span><span><strong>Client experience</strong><small>Make booking feel effortless</small></span><span className="auth-preview-arrow">↗</span></div></div>
        <small className="auth-photo-credit">Photo by <a href="https://unsplash.com/photos/makeup-artist-applying-makeup-to-a-model-in-studio-f9qZXRNtXGc" target="_blank" rel="noreferrer">Vitaly Gariev</a> on Unsplash</small>
      </section>
      <section className="auth-card auth-signin-card">
        <span className="eyebrow">WELCOME BACK</span>
        <h1>Good to see you again.</h1>
        <p className="auth-subtitle">Sign in to manage your studio or pick up where you left off.</p>
        {params.error === "confirmation" && <div className="auth-error">That verification link has expired or was already used. Sign in or request a fresh link.</div>}
        <AuthForm mode="sign-in" nextPath={params.next || "/book"} />
        <p className="auth-switch">New to BeatBook? <Link href="/sign-up">Create an account</Link></p>
      </section>
    </div>
    <p className="auth-footer">Beauty bookings, beautifully organized.</p>
  </main>;
}

