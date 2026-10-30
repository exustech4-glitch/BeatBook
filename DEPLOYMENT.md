# Deploy BeatBook to Vercel

## 1. Apply the Supabase database migrations

In the Supabase Dashboard, open **SQL Editor** and run these files in order:

1. `supabase/migrations/20261030000100_beatbook_foundation.sql`
2. `supabase/migrations/20261030000200_booking_lifecycle.sql`

The migrations create the app schema, security policies, and booking lifecycle functions. Do not use the app before both have completed successfully.

## 2. Configure Supabase Auth

In **Authentication → URL Configuration**, set the production Site URL to your Vercel domain (for example `https://your-project.vercel.app`) and add these Redirect URLs:

- `http://localhost:3000/auth/callback`
- `https://your-project.vercel.app/auth/callback`
- `https://*-your-team.vercel.app/auth/callback` for Vercel Preview deployments, using the wildcard pattern accepted by your Supabase project.

Keep email confirmation enabled. The booking action requires a confirmed client email.

## 3. Import the GitHub repository into Vercel

In Vercel, select **Add New → Project**, import `exustech4-glitch/BeatBook`, and keep the detected Next.js framework and default build settings. The production branch is `main`.

Add these environment variables in **Project Settings → Environment Variables** for Development, Preview, and Production:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (formerly anon key) |
| `NEXT_PUBLIC_SITE_URL` | The matching app URL for that environment; use the Vercel production domain for Production |

No service-role key is used by this application. Do not add one as a `NEXT_PUBLIC_` variable. Redeploy after changing environment variables.

## 4. Verify the first deployment

1. Open the Vercel URL and create an artist account.
2. Confirm the email, sign in, complete setup, and publish the booking page.
3. Create a client account with a different email and confirm it.
4. Submit a booking request, approve it as the artist, and exercise the test deposit result from **My bookings**.

The deposit controls are explicitly test-only and do not charge money. Configure an email provider in Supabase Auth before inviting real users; Supabase's default email service is intended for limited testing.

## Booking request expiry

Pending booking requests expire after 24 hours when the database function `public.expire_booking_requests()` runs. For production, enable the Supabase `pg_cron` extension and schedule it once per minute from the SQL Editor:

```sql
select cron.schedule(
  'beatbook-expire-booking-requests',
  '* * * * *',
  $$select public.expire_booking_requests();$$
);
```

Check **Integrations → Cron** to confirm the job runs. This scheduled task is separate from Vercel and runs in Supabase.

