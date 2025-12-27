# Doctor Barber

Next.js landing page with booking form, client login, and a simple CMS view for appointments.

## Local dev
```bash
npm install
npm run dev
```

## Env vars
Copy `.env.example` to `.env.local` and update values:
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_ADMIN_KEY`
- `NEXT_PUBLIC_ADMIN_USER`
- `NEXT_PUBLIC_ADMIN_PASS`

## Routes
- `/` landing + booking
- `/login` client login
- `/admin` CMS panel

## API (cPanel)
See `api/README.md` for upload and setup steps.
