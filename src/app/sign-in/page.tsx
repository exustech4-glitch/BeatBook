import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  return <main className="auth-page">
    <Link className="auth-brand" href="/book"><span className="brand-mark">b.</span> beatbook</Link>
    <section className="auth-card">
      <span className="eyebrow">WELCOME BACK</span>
      <h1>Good to see you again.</h1>
      <p className="auth-subtitle">Sign in to manage your studio or pick up where you left off.</p>
      {params.error === "confirmation" && <div className="auth-error">That verification link has expired or was already used. Sign in or request a fresh link.</div>}
      <AuthForm mode="sign-in" nextPath={params.next || "/book"} />
      <p className="auth-switch">New to BeatBook? <Link href="/sign-up">Create an account</Link></p>
    </section>
    <p className="auth-footer">Beauty bookings, beautifully organized.</p>
  </main>;
}
