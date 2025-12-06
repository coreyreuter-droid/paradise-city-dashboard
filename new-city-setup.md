
---

### `new-city-setup.md` (full file)

```md
# 🏙 New City Setup Guide

This guide walks through standing up **a brand-new city** using this CiviPortal codebase.

**One city = one Supabase project + one Vercel deployment.**

Use this when you’re onboarding a new customer or spinning up a demo environment.

---

## 1. Create the Supabase project

1. Go to Supabase → **New Project**
2. Name it after the city, e.g. `springfield-budget`
3. Save:
   - Project URL
   - anon public key
   - service role key

You’ll plug these into environment variables later.

---

## 2. Create the required tables

You must create the following tables with these names:

- `budgets`
- `actuals`
- `revenues`
- `transactions`
- `portal_settings`
- `data_uploads`
- `profiles`

See `README-Onboarding.md` for the exact column definitions and example SQL.

Do **not** change table names; the app references them directly in `lib/queries.ts` and in API routes.

Once tables exist, you can:

- Import CSVs for:
  - `budgets`
  - `actuals`
  - `revenues`
  - `transactions`
- Manage branding and content through the admin UI, which writes to:
  - `portal_settings`
  - `data_uploads`
  - `profiles`

---

## 3. Configure Supabase Auth + profiles

The app uses Supabase Auth with email-based login (magic link).

1. Make sure **Email** auth is enabled in Supabase.
2. Confirm SMTP is configured so invitation emails can be delivered.
3. Create the `profiles` table (if you don’t already have one) to match:

   - `id` (UUID, references `auth.users.id`)
   - `role` (text)
   - `created_at` (timestamp)

   See `README-Onboarding.md` for the SQL example.

4. Create your own user:
   - Either via Supabase → Auth → **Add user**
   - Or by hitting the `/[citySlug]/login` page and going through the magic link flow

5. Promote yourself to `super_admin`:

   - Get your `auth.users.id` from Supabase.
   - Insert a row into `profiles` with that id and `role = 'super_admin'`.

The admin APIs and `AdminGuard` rely on `profiles.role` to gate access.

---

## 4. Branding storage bucket

Create a public Storage bucket named:

- `branding`

The hero image upload API (`app/api/admin/hero-image/route.ts`) writes into this bucket.

Make sure the bucket is public so the front-end can load images without signed URLs.

---

## 5. App configuration (env vars)

In Vercel and/or `.env.local`, set:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

NEXT_PUBLIC_CITY_SLUG=springfield
NEXT_PUBLIC_CITY_NAME="City of Springfield"
NEXT_PUBLIC_CITY_TAGLINE="Open budget and spending transparency"

NEXT_PUBLIC_CITY_PRIMARY_COLOR=#1e3a8a
NEXT_PUBLIC_CITY_PRIMARY_TEXT=#ffffff
NEXT_PUBLIC_CITY_ACCENT_COLOR=#3b82f6
