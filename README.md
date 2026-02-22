# Srdjan Salon Scheduler v1

Next.js 16 + Supabase booking platform for **Frizerski salon Srdjan**.

## Stack
- Next.js App Router (frontend + API route handlers)
- Supabase Postgres (schema in `supabase/migrations`)
- Cookie sessions (client soft-auth, admin RBAC)
- Web Push (best effort) + in-app appointment notifications

## Roles
- `owner`: full access (dashboard + revenue + all operations)
- `staff-admin`: operations only (calendar, shifts, appointments, services, clients, notifications)

## Core rules
- Slot grid: **20 minutes**
- Worker-specific services/duration/price
- Morning/afternoon shifts
- Shift swap allowed only if **both workers have 0 appointments** on that date
- Day cancellation for worker requires reason, writes cancellation reason, sends push + in-app notice
- Calendar blocks are rounded to the nearest **20-minute** step

## Local dev
```bash
npm install
npm run dev
```

## Environment
Copy `.env.example` to `.env.local` and fill values:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`
- `ADMIN_SESSION_SECRET`
- `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` (optional)
- `WEB_PUSH_VAPID_PUBLIC_KEY` (optional)
- `WEB_PUSH_VAPID_PRIVATE_KEY` (optional)

You can keep:
- `NEXT_PUBLIC_SUPABASE_URL=https://hrkfvkxvwuqmbplqagkq.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...`

## Database setup (Supabase)
1. Run SQL migration:
- `supabase/migrations/20260217190000_srdjan_scheduler.sql`
2. Run seed:
- `supabase/seed.sql`

Seed defaults:
- 1 location
- 4 workers
- initial services per worker
- shift defaults `11:00-15:00` and `15:00-19:00`
- admin users:
  - `owner / owner123!`
  - `staff / staff123!`

## Main API routes
Public:
- `POST /api/public/session/start`
- `GET /api/public/bootstrap`
- `GET /api/public/availability`
- `POST /api/public/appointments`
- `GET /api/public/my-appointments`
- `POST /api/public/push/subscribe`

Admin:
- `POST /api/admin/auth/login`
- `GET /api/admin/me`
- `GET /api/admin/dashboard` (owner only)
- `GET /api/admin/workers/:workerId/calendar`
- `POST /api/admin/shifts/week`
- `POST /api/admin/shifts/swap`
- `POST /api/admin/appointments/cancel-worker-day`
- `GET|POST|PATCH /api/admin/services`
- `GET /api/admin/clients`
- `GET /api/admin/notifications`
