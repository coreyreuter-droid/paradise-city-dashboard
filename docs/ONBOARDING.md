# CiviPortal Customer Onboarding

*Last Updated: January 2025*

This is the canonical guide for setting up new CiviPortal customers.

## Overview

Each customer gets:
- Their own Supabase project (data isolation)
- Their own Vercel deployment (forked repo)
- Their own subdomain ([customer].civiportal.com)

**Time required:** 45-60 minutes (experienced) / 2-3 hours (first time)

---

## Prerequisites

Before starting, ensure you have access to:
- 1Password (credentials storage)
- Supabase (CiviPortal org)
- GitHub (CiviPortal account)
- Vercel (CiviPortal team)
- Cloudflare (civiportal.com domain)

---

## Step 1: Create Supabase Project

1. Go to supabase.com, sign in with CiviPortal account
2. Click **New Project** in CiviPortal org
3. Configure:
   - Name: `civiportal-[city]-[state]` (e.g., `civiportal-springfield-il`)
   - Database Password: Click "Generate" and **copy it immediately**
   - Region: East US (N. Virginia)
   - Plan: Pro
4. Save to 1Password:
   - Project URL (from Settings → API)
   - Anon key (from Settings → API)
   - Service role key (from Settings → API, click Reveal)
   - Database password

---

## Step 2: Set Up Database

### Run Schema and Migrations

In Supabase SQL Editor, run these files **in order**:

| Order | File | Purpose |
|-------|------|---------|
| 1 | `database/schema.sql` | Base tables and RLS |
| 2 | `migrations/002_lock_down_security_definer.sql` | Security hardening |
| 3 | `migrations/003_search_counts_rpc.sql` | Search functions |
| 4 | `migrations/004_add_totals_views.sql` | Summary views |
| 5 | `migrations/006_auto_create_profile.sql` | Auto-create user profiles |
| 6 | `migrations/007_add_enable_projects.sql` | Capital projects tables and feature flag |

**Optional:**
- `migrations/005_clean_html_encoded_data.sql` — Only if importing legacy data with encoding issues

### Verify Setup

Run `scripts/verify-tenant.sql` — **all checks must pass**.

### Verify Tables

In Table Editor, confirm these tables exist:
- profiles, portal_settings, budgets, actuals, transactions, revenues, rate_limits
- capital_projects, capital_project_images (for Capital Projects module)

---

## Step 3: Create Storage Buckets

In Supabase Storage, create these buckets:

| Bucket | Public | Purpose | MIME Types |
|--------|--------|---------|------------|
| `branding` | ON | Logo, seal, hero, leader photos | image/png, image/jpeg, image/webp |
| `project-images` | ON | Capital project photos | image/png, image/jpeg, image/webp |

⚠️ **Do NOT allow SVG files** (security risk)

### Set Up Storage Policies

For each bucket, add these RLS policies:

**Public read (both buckets):**
```sql
CREATE POLICY "Public read" ON storage.objects
FOR SELECT USING (bucket_id = 'branding');
```

**Authenticated upload (both buckets):**
```sql
CREATE POLICY "Authenticated upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'branding' 
  AND auth.role() = 'authenticated'
);
```

**Authenticated delete (both buckets):**
```sql
CREATE POLICY "Authenticated delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'branding' 
  AND auth.role() = 'authenticated'
);
```

Repeat for `project-images` bucket.

### Test Storage

Upload an image, get public URL, verify it loads in incognito browser.

---

## Step 4: Fork GitHub Repository

1. Go to `github.com/coreyreuter-droid/paradise-city-dashboard`
2. Click Fork → Create new fork
3. Name: `civiportal-[city]-[state]`
4. Save fork URL to 1Password

---

## Step 5: Deploy to Vercel

1. Import the forked repo in Vercel
2. Add environment variables:

| Variable | Value | Scope |
|----------|-------|-------|
| NEXT_PUBLIC_SUPABASE_URL | https://[id].supabase.co | All |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | [anon key] | All |
| SUPABASE_SERVICE_ROLE_KEY | [service role key] | **Production only** |
| NEXT_PUBLIC_CITY_SLUG | portal | All |
| RATE_LIMIT_SALT | [32 random chars] | All |

3. Deploy

---

## Step 6: Configure Domain

### In Vercel
Settings → Domains → Add: `[subdomain].civiportal.com`

### In Cloudflare
Add CNAME record:
- Name: `[subdomain]`
- Target: `cname.vercel-dns.com`
- Proxy: **OFF** (gray cloud, not orange!)

Wait for green checkmark in Vercel (1-5 minutes).

---

## Step 7: Create Admin User

1. Supabase Auth → Add user
   - Email: customer's admin email
   - Password: generate secure password
   - Auto Confirm: **ON**
2. Copy the User UID
3. Table Editor → profiles → Insert row:
   - id: [User UID]
   - role: `super_admin`
4. Send credentials via 1Password Secure Share (7 days, 2 views)

---

## Step 8: Configure Portal Settings

Log into admin panel at `https://[subdomain].civiportal.com/portal/admin`:

### Modules (Settings → Modules Enable/Disable)
Enable only what customer needs:
- ✅ Budget & Actuals (always)
- ⬜ Transactions (if they have payment data)
- ⬜ Vendors (if they want vendor breakdown, requires Transactions)
- ⬜ Revenues (if they have revenue data)
- ⬜ Capital Projects (if they have infrastructure projects)

### Fiscal Year (Settings → Fiscal Year)
- Set start month (usually July for most cities)
- Set start day (usually 1)
- Optionally add public label (e.g., "July 1 – June 30")

### Branding (Settings → Branding)
- Upload logo (PNG with transparency, max 5MB)
- Upload seal (optional)
- Upload hero image (1920×600 recommended, max 5MB)
- Set colors or choose a preset theme
- Set gov name and tagline

### Landing Page Content (Settings → Story Sections, Leadership, etc.)
- Hero message
- Gov description ("About our community")
- Year-in-review highlights
- Leader name, title, message, and photo
- Gov stats (population, employees, area)
- Featured projects (1-3 cards with images)

---

## Step 9: Upload Data

### CSV Required Columns

**Budgets:**
```
fiscal_year, fund_code, fund_name, department_code, department_name, 
category, account_code, account_name, amount
```

**Actuals:**
```
fiscal_year, period, fund_code, fund_name, department_code, department_name, 
category, account_code, account_name, amount
```
*Note: `period` is a calendar month in YYYY-MM format (e.g., 2027-08)*

**Transactions:**
```
date, fiscal_year, fund_code, fund_name, department_code, department_name, 
account_code, account_name, vendor, description, amount
```

**Revenues:**
```
fiscal_year, period, fund_code, fund_name, department_code, department_name, 
category, account_code, account_name, amount
```
*Note: `period` is a calendar month in YYYY-MM format*

### Upload Order
1. Budgets
2. Actuals
3. Transactions (if enabled)
4. Revenues (if enabled)

---

## Step 10: Capital Projects (if enabled)

If the customer wants to showcase infrastructure investments:

1. Go to Admin → Capital Projects
2. Click **New Project** for each project
3. Fill in:
   - Title and description
   - Category (Infrastructure, Parks, Facilities, Utilities, Other)
   - Status (Planning, In Progress, Completed, On Hold)
   - Budget and amount spent
   - Start and end dates
   - Upload project images (up to 10, max 5MB each)
4. Optionally link projects to budget departments

---

## Step 11: QA Checklist

### Pages Load
- [ ] Landing page (hero, branding, content sections)
- [ ] Overview dashboard
- [ ] Budget page
- [ ] Departments (list + detail)
- [ ] Analytics
- [ ] Download center
- [ ] Transactions (if enabled)
- [ ] Revenues (if enabled)
- [ ] Capital Projects (if enabled)

### Functionality
- [ ] Fiscal year selector works
- [ ] Search works
- [ ] Charts render correctly
- [ ] CSV download works
- [ ] Print looks correct
- [ ] Mobile layout works

### Images
- [ ] Logo displays correctly
- [ ] Hero image loads
- [ ] Leader photo displays (if set)
- [ ] Project images load (if using Capital Projects)

### Data Accuracy
- [ ] Budget totals match customer records
- [ ] No encoding issues (`&amp;` etc.)
- [ ] All expected fiscal years present
- [ ] Fiscal year mapping is correct (check period → FY logic)

### Customer Sign-Off
- [ ] Walked through site with customer
- [ ] Customer approved go-live

---

## Step 12: Go Live

1. In Admin → Branding & settings
2. Click the **Publish status** toggle to change from Draft to Published
3. Verify in incognito browser (no login required)
4. Send launch email to customer

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No data on public site | Check is_published = true in settings |
| Admin can't login | Verify UUID in profiles table with correct role |
| Domain "Invalid Configuration" | Cloudflare proxy must be OFF (gray cloud) |
| SSL error | Wait 10-15 minutes for certificate provisioning |
| Images 403 | Bucket must be Public, check storage policies |
| Upload fails | Check SERVICE_ROLE_KEY in Vercel environment |
| Dept shows `&amp;` | Run migration 005 to clean HTML encoding |
| Capital projects not showing | Check enable_projects flag in portal_settings |
| Image upload fails | Check file size (<5MB) and format (PNG/JPEG/WebP) |
| Wrong fiscal year | Check period format (YYYY-MM) and FY start config |

---

## Post-Launch Support

Provide customer with:
1. Admin panel URL: `https://[subdomain].civiportal.com/portal/admin`
2. Link to Help & FAQs page (in admin panel)
3. Instructions for annual budget cycle updates
4. Contact info for support escalation

---

## Contacts

- Support: hello@civiportal.com
- Escalation: corey@civiportal.com / 573-489-7840
