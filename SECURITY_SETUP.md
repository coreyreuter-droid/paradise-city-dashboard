# Customer Onboarding Guide

This guide walks through setting up a new CiviPortal customer deployment.

## Prerequisites

- Supabase account (or organization)
- Vercel account
- Access to this repository

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Name it: `civiportal-{customer-slug}` (e.g., `civiportal-columbia-mo`)
3. Generate a strong database password (save it somewhere safe)
4. Select region closest to customer
5. Wait for project to provision (~2 minutes)

---

## Step 2: Run Database Setup

### 2a. Run the main schema

1. Go to **SQL Editor** in Supabase Dashboard
2. Open `database/schema.sql` from this repo
3. Copy entire contents and paste into SQL Editor
4. Click **Run**
5. Verify: Go to **Table Editor** — you should see all tables

### 2b. Run migrations

Run each migration file in order:

```
migrations/001_rate_limits.sql
migrations/002_lock_down_security_definer.sql
migrations/003_search_counts_rpc.sql
```

For each file:
1. Copy contents
2. Paste into SQL Editor
3. Click **Run**

### 2c. Verify security

Run `scripts/security-check.sql` in SQL Editor.

**Expected results:**
- CHECK 1: 0 rows (no PUBLIC execute on SECURITY DEFINER)
- CHECK 3: 0 rows (all data tables have RLS)
- CHECK 4: 0 rows
- CHECK 5: 0 rows

If any check fails, re-run migration 002.

---

## Step 3: Create Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Click **New bucket**
3. Settings:
   - Name: `branding`
   - Public: **YES**
   - Allowed MIME types: `image/png, image/jpeg, image/webp`
   - Max file size: `10MB`
4. Click **Create bucket**

**Important:** Do NOT allow `image/svg+xml` — SVG is an XSS vector.

---

## Step 4: Create Admin User

1. Go to **Authentication** → **Users**
2. Click **Add user** → **Create new user**
3. Enter customer's email and a temporary password
4. Copy the user's UUID from the table
5. Go to **SQL Editor** and run:

```sql
INSERT INTO profiles (id, role) 
VALUES ('paste-uuid-here', 'super_admin');
```

6. Send customer their login credentials

---

## Step 5: Deploy to Vercel

### 5a. Create new deployment

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import this repository
3. Set **Framework Preset** to Next.js

### 5b. Set environment variables

Add these environment variables (for **All Environments**):

| Variable | Value | Where to find |
|----------|-------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Supabase → Settings → API (reveal) |
| `NEXT_PUBLIC_CITY_SLUG` | `columbia-mo` | Your choice (URL-safe) |
| `SENTRY_AUTH_TOKEN` | (optional) | Sentry dashboard |

### 5c. Set custom domain (optional)

1. Go to **Settings** → **Domains**
2. Add customer's domain (e.g., `transparency.columbia-mo.gov`)
3. Follow DNS instructions

### 5d. Deploy

Click **Deploy** and wait for build to complete.

---

## Step 6: Final Verification

Visit the deployed site and verify:

- [ ] Homepage loads (may show "unpublished" message)
- [ ] Login works with admin credentials
- [ ] Admin can access `/admin` pages
- [ ] CSV upload works
- [ ] Search works
- [ ] Trying `/wrong-slug/overview` returns 404

---

## Step 7: Customer Handoff

Send customer:

1. Login URL: `https://{domain}/{slug}/login`
2. Admin credentials (email + temporary password)
3. Link to admin help docs
4. Instructions to:
   - Change password
   - Configure branding
   - Upload financial data
   - Publish when ready

---

## Troubleshooting

### "Permission denied for function X"

Re-run `migrations/002_lock_down_security_definer.sql`, then check if the function needs to be granted back:

```sql
-- For RLS helper functions (safe to grant)
GRANT EXECUTE ON FUNCTION public.is_portal_published() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_fiscal_years_for_table(text) TO authenticated;
```

### Data not showing on portal

1. Check `portal_settings.is_published` is `true`
2. Check data was uploaded for the correct fiscal year
3. Check browser console for errors

### Rate limit table missing

Run `migrations/001_rate_limits.sql`.

---

## Security Checklist

Before going live, verify:

- [ ] `security-check.sql` passes (0 rows on all checks)
- [ ] Storage bucket does NOT allow SVG
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is not in any `NEXT_PUBLIC_*` variable
- [ ] Admin user has been created with `super_admin` role
- [ ] Customer has changed their temporary password
