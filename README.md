# BeatBook

BeatBook is a Next.js booking app for an independent makeup artist and their clients. It includes artist onboarding, a published booking page, booking requests, artist approval, a temporary deposit reservation, client booking management, and cancellation or reschedule requests.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set the public Supabase project URL, publishable key, and site URL. The root route opens the booking page. Create an artist account to set up and publish the artist profile, and a client account to request appointments.

## Production setup

Follow [DEPLOYMENT.md](./DEPLOYMENT.md) to configure Supabase and Vercel. Apply both SQL migrations in order before using booking actions. Payments are simulated for this release; the app does not collect real money.

## Included

- Supabase email sign-up, sign-in, email confirmation, and role-based route access.
- Artist business profile, primary service, weekly hours, travel area, and booking policy setup.
- Published booking page with server-side price, schedule, and overlap validation.
- 24-hour booking requests and a 15-minute deposit reservation after artist approval.
- Test-only deposit outcomes, client booking list, and cancellation or reschedule review.
- Row-level security for booking, payment, notification, and request records.

Availability is checked in the database when a booking request is submitted. The artist schedule is shown in its configured time zone (Africa/Lagos by default).

