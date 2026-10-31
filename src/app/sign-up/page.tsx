import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const nextPath = params.next || "/book";
  return <main className="auth-page">
    <Link className="auth-brand" href="/book"><span className="brand-mark">b.</span> beatbook</Link>
    <section className="auth-card">
      <span className="eyebrow">A LOVELY PLACE TO BEGIN</span>
      <h1>Your next chapter starts here.</h1>
      <p className="auth-subtitle">Create an account to request appointments or set up your artist studio.</p>
      <AuthForm mode="sign-up" nextPath={nextPath} />
      <p className="auth-switch">Already have an account? <Link href={`/sign-in?next=${encodeURIComponent(nextPath)}`}>Sign in</Link></p>
    </section>
    <p className="auth-footer">Beauty bookings, beautifully organized.</p>
  </main>;
}

