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

**Optional:**
- `migrations/005_clean_html_encoded_data.sql` — Only if importing legacy data with encoding issues

### Verify Setup

Run `scripts/verify-tenant.sql` — **all checks must pass**.

### Verify Tables

In Table Editor, confirm these tables exist:
- profiles, portal_settings, budgets, actuals, transactions, revenues, rate_limits

---

## Step 3: Create Storage Buckets

In Supabase Storage:

| Bucket | Public | MIME Types |
|--------|--------|------------|
| branding | ON | image/png, image/jpeg, image/webp |
| project-images | ON | image/png, image/jpeg, image/webp |

⚠️ **Do NOT allow SVG files** (security risk)

Test: Upload an image, get public URL, verify it loads in incognito browser.

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

## Step 8: Configure Portal

Log into admin panel at `https://[subdomain].civiportal.com/portal/admin`:

1. **Branding:** Upload logo, set colors, city name, tagline
2. **Fiscal Year:** Set start month (usually July)
3. **Modules:** Enable only what customer needs:
   - Budget & Actuals (always)
   - Transactions (if they have payment data)
   - Vendors (if they want vendor breakdown)
   - Revenues (if they have revenue data)
   - Projects (if they have capital projects)

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

### Upload Order
1. Budgets
2. Actuals
3. Transactions (if enabled)
4. Revenues (if enabled)

---

## Step 10: QA Checklist

### Pages Load
- [ ] Home/Overview
- [ ] Budget
- [ ] Departments (list + detail)
- [ ] Analytics
- [ ] Download
- [ ] Transactions (if enabled)
- [ ] Revenues (if enabled)

### Functionality
- [ ] Fiscal year selector works
- [ ] Search works
- [ ] Charts render
- [ ] CSV download works
- [ ] Print looks correct

### Data Accuracy
- [ ] Totals match customer records
- [ ] No encoding issues (`&amp;` etc.)
- [ ] All expected years present

### Customer Sign-Off
- [ ] Walked through site with customer
- [ ] Customer approved go-live

---

## Step 11: Go Live

1. In Supabase Table Editor → portal_settings
2. Set `is_published` = `true`
3. Verify in incognito browser
4. Send launch email to customer

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No data on public site | Set is_published = true |
| Admin can't login | Add UUID to profiles with role |
| Domain "Invalid Configuration" | Cloudflare proxy must be OFF |
| SSL error | Wait 10-15 minutes |
| Images 403 | Bucket must be Public |
| Upload fails | Check SERVICE_ROLE_KEY in Vercel |
| Dept shows `&amp;` | Run migration 005 |

---

## Contacts

- Support: hello@civiportal.com
- Escalation: corey@civiportal.com / 573-489-7840
