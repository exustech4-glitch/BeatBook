# BeatBook

BeatBook is a Next.js app for an independent makeup artist and the clients who book them.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The root route opens the public booking page. Artist dashboard access requires an authenticated artist account.

## Connect Supabase

1. Create a Supabase project and copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` from your project.
3. Apply `supabase/migrations/20261030000100_beatbook_foundation.sql` in the Supabase SQL Editor, or link the Supabase CLI and run `supabase db push`.
4. In Supabase Auth, keep email confirmation enabled and add `http://localhost:3000/auth/callback` to the allowed redirect URLs. Add the production callback URL when deploying.
5. Restart the Next.js server after changing environment variables.

## Phase 2

- Cookie based Supabase sign-up, sign-in, email confirmation callback, and sign-out.
- Artist and client roles are created by the database trigger. A user cannot change their own role through the profile table.
- The artist dashboard and onboarding routes require an authenticated artist account.
- Artist profile setup saves a business profile to Supabase and supports resuming from saved data.
- The database migration adds artist services, weekly working hours, travel areas, blocked dates, and versioned policies with row level security.

The booking and dashboard examples are still prototype data. Booking submissions, availability locking, payment reservations, and notifications are the next phase after connecting and applying the Supabase project setup.
