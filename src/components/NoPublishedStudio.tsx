import Link from "next/link";

export default function NoPublishedStudio() {
  return <main className="no-studio-page"><Link className="auth-brand" href="/"><span className="brand-mark">b.</span> beatbook</Link><section><span className="eyebrow">YOUR NEXT BEAUTIFUL MOMENT</span><h1>No artist has published a booking page yet.</h1><p>Try again after your makeup artist finishes studio setup, or sign in if you’re setting up the studio.</p><Link className="button primary" href="/sign-in">Artist sign in <span>→</span></Link></section></main>;
}

