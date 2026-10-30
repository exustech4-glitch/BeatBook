"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "@/app/auth/actions";

export default function AuthForm({ mode, nextPath = "/book" }: { mode: "sign-in" | "sign-up"; nextPath?: string }) {
  const action = mode === "sign-in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});
  return <form action={formAction} className="auth-form">
    {mode === "sign-up" && <>
      <label className="field-label auth-label">YOUR NAME<input name="display_name" autoComplete="name" placeholder="How should we call you?" required minLength={2} /></label>
      <label className="field-label auth-label">I’M HERE AS
        <select name="account_role" defaultValue="CLIENT"><option value="CLIENT">A client booking beauty services</option><option value="ARTIST">A makeup artist setting up my studio</option></select>
      </label>
    </>}
    <label className="field-label auth-label">EMAIL ADDRESS<input type="email" name="email" autoComplete="email" placeholder="you@example.com" required /></label>
    <label className="field-label auth-label">PASSWORD<input type="password" name="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} placeholder={mode === "sign-up" ? "At least 8 characters" : "Your password"} required minLength={mode === "sign-up" ? 8 : undefined} /></label>
    {mode === "sign-in" && <input type="hidden" name="next" value={nextPath} />}
    {state.error && <p className="auth-error" role="alert">{state.error}</p>}
    {state.success && <p className="auth-success" role="status">{state.success} <Link href="/check-email">Continue</Link></p>}
    <button className="button primary auth-submit" type="submit" disabled={pending}>{pending ? "One moment…" : mode === "sign-in" ? "Sign in" : "Create your account"}<span>→</span></button>
    {mode === "sign-up" && <small className="auth-terms">By joining, you agree to our Terms and Privacy Policy.</small>}
  </form>;
}
