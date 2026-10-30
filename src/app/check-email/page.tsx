import Link from "next/link";

export default function CheckEmailPage() {
  return <main className="auth-page">
    <Link className="auth-brand" href="/book"><span className="brand-mark">b.</span> beatbook</Link>
    <section className="auth-card check-email-card">
      <div className="email-icon">✉</div>
      <span className="eyebrow">ONE QUICK CHECK</span>
      <h1>Check your inbox.</h1>
      <p className="auth-subtitle">We sent you a verification link. Confirm your email to finish creating your account.</p>
      <Link className="button primary auth-submit" href="/sign-in">Continue to sign in <span>→</span></Link>
    </section>
    <p className="auth-footer">Beauty bookings, beautifully organized.</p>
  </main>;
}
