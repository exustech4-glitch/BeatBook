# BeatBook

BeatBook is a Next.js app for an independent makeup artist and the clients who book them.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Current slice

- Artist dashboard with overview metrics, booking request review, approve/decline actions, upcoming appointments, and a calendar preview.
- Client booking flow with service selection, date/time selection, travel area pricing, deposit and balance breakdown, address validation, and request confirmation.
- Responsive styling based on the BeatBook style guide and wireframes.
- All payments are described as test-only. No payment is taken.

The current app is a UI workflow prototype. Its example bookings and services are in memory and reset on refresh. It does not yet implement accounts, email verification, database persistence, server-side availability locking, email notifications, or reservation expiry. Those are required before this can be used as a live booking service; the current screens do not claim otherwise.
