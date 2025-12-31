# CiviPortal Customer Onboarding Guide

**Version:** 1.1  
**Last Updated:** December 2024

This guide walks you through setting up a new CiviPortal customer from start to finish. Follow each step in order. No prior knowledge of the project is required.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Gather Customer Information](#2-gather-customer-information)
3. [Create Supabase Project](#3-create-supabase-project)
4. [Set Up Database Tables](#4-set-up-database-tables)
5. [Fork the GitHub Repository](#5-fork-the-github-repository)
6. [Deploy to Vercel](#6-deploy-to-vercel)
7. [Configure the Domain](#7-configure-the-domain)
8. [Create Admin Account](#8-create-admin-account)
9. [Initial Site Configuration](#9-initial-site-configuration)
10. [Help Customer Upload Data](#10-help-customer-upload-data)
11. [Go Live](#11-go-live)
12. [Send Handoff Email](#12-send-handoff-email)
13. [Pushing Updates to Customers](#13-pushing-updates-to-customers)
14. [Troubleshooting](#14-troubleshooting)
15. [Cost Reference](#15-cost-reference)
16. [Understanding Row Level Security (RLS)](#16-understanding-row-level-security-rls)

---

## 1. Prerequisites

Before you begin, make sure you have access to:

| Account | URL | What It's For |
|---------|-----|---------------|
| GitHub | github.com | Stores the website code |
| Vercel | vercel.com | Hosts the website |
| Supabase | supabase.com | Database and user authentication |
| Cloudflare | cloudflare.com | DNS management for civiportal.com |
| Password Manager | (your choice) | Store customer credentials securely |

You'll also need:
- The main CiviPortal GitHub repository URL
- The SQL schema file (see Appendix A)
- Access to the civiportal.com DNS settings in Cloudflare

---

## 2. Gather Customer Information

Send this questionnaire to the customer before starting:

### Required Information

```
CIVIPORTAL SETUP QUESTIONNAIRE

1. BASIC INFORMATION
   - Official city/county name: _______________________
   - State: _______________________
   - Preferred URL slug (e.g., "springfield-il"): _______________________
   
2. ADMIN CONTACT
   - Primary admin name: _______________________
   - Primary admin email: _______________________
   - Phone number (for support): _______________________

3. BRANDING
   - Primary brand color (hex code, e.g., #1E40AF): _______________________
   - Secondary/accent color (optional): _______________________
   - Please attach: Logo file (PNG or SVG, transparent background preferred)
   - Please attach: City seal (optional)

4. FISCAL YEAR
   - When does your fiscal year start? 
     [ ] January 1
     [ ] July 1  
     [ ] Other: _______________________

5. DATA MODULES (check all that apply)
   [ ] Budget data
   [ ] Actual spending data
   [ ] Individual transactions
   [ ] Vendor/payee information
   [ ] Revenue data

6. DOMAIN PREFERENCE
   [ ] Use subdomain: [cityname].civiportal.com (included)
   [ ] Use our own domain: _______________________ 
       (requires customer to update their DNS)
```

### Create Customer Folder

Create a folder to store all customer information:

```
/Customers
  /springfield-il
    /credentials.txt      (Supabase keys, admin passwords - SECURE)
    /logo.png
    /seal.png
    /questionnaire.pdf
    /notes.txt
```

**IMPORTANT:** Store credentials securely. Use a password manager, not plain text files.

---

## 3. Create Supabase Project

Supabase is the database that stores all the customer's financial data.

### Step 3.1: Log into Supabase

1. Go to **https://supabase.com**
2. Click **Sign In** (top right)
3. Log in with your credentials

### Step 3.2: Create New Project

1. From the dashboard, click the **New Project** button
2. Select your organization (or create one if prompted)
3. Fill in the project details:

| Field | What to Enter | Example |
|-------|---------------|---------|
| **Name** | `civiportal-[city]-[state]` | `civiportal-springfield-il` |
| **Database Password** | Click "Generate" for a strong password | `aB3$kL9#mN2@pQ5` |
| **Region** | Choose closest to customer | `East US (North Virginia)` |
| **Pricing Plan** | Start with Free, upgrade later if needed | `Free` |

4. **IMPORTANT:** Copy the database password and save it in the customer's credentials file. You cannot retrieve it later.

5. Click **Create new project**

6. Wait 2-3 minutes for the project to initialize. You'll see a loading screen.

### Step 3.3: Get API Keys

Once the project is ready:

1. Click **Settings** (gear icon) in the left sidebar
2. Click **API** under "Project Settings"
3. You'll see a page with your keys. Copy and save these:

| Key Name | Where to Find It | What It Looks Like |
|----------|------------------|-------------------|
| **Project URL** | Under "Project URL" | `https://abcdefgh.supabase.co` |
| **anon public** | Under "Project API keys" | Long string starting with `eyJ...` |
| **service_role** | Under "Project API keys" (click "Reveal") | Long string starting with `eyJ...` |

**SECURITY WARNING:** The `service_role` key has full database access. Never expose it publicly or put it in client-side code.

Save all three values in the customer's credentials file:

```
SUPABASE CREDENTIALS - Springfield, IL
======================================
Project URL: https://abcdefgh.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Database Password: aB3$kL9#mN2@pQ5
```

---

## 4. Set Up Database Tables

Now we need to create all the tables that store financial data.

### Step 4.1: Open SQL Editor

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query** (top right)

### Step 4.2: Run the Schema

1. Open the file `database/schema.sql` from the CiviPortal repository (see Appendix A if you don't have this file)
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click **Run** (or press Cmd+Enter / Ctrl+Enter)
5. You should see "Success. No rows returned" - this is normal

### Step 4.3: Verify Tables Were Created

1. Click **Table Editor** in the left sidebar
2. You should see these tables:
   - `profiles`
   - `portal_settings`
   - `budgets`
   - `actuals`
   - `transactions`
   - `revenues`
   - `rate_limits`
   - (and possibly others)

If you don't see these tables, the SQL didn't run correctly. Check for error messages and try again.

### Step 4.4: Initialize Portal Settings

1. Click on the **portal_settings** table
2. Click **Insert row**
3. Fill in:

| Column | Value |
|--------|-------|
| id | `1` |
| city_name | Customer's city name (e.g., `Springfield, IL`) |
| tagline | `Transparent Government, Empowered Citizens.` |
| primary_color | Customer's brand color (e.g., `#1E40AF`) |
| is_published | `false` |
| enable_actuals | `true` |
| enable_transactions | `true` |
| enable_vendors | `true` |
| enable_revenues | `true` |

4. Click **Save**

---

## 5. Fork the GitHub Repository

Each customer gets their own copy of the code. This allows customization and independent updates.

### Step 5.1: Log into GitHub

1. Go to **https://github.com**
2. Sign in with your credentials

### Step 5.2: Fork the Repository

1. Go to the main CiviPortal repository (e.g., `https://github.com/your-org/civiportal`)
2. Click the **Fork** button (top right)
3. Under "Repository name," enter: `civiportal-springfield-il` (use customer's slug)
4. Make sure "Copy the main branch only" is checked
5. Click **Create fork**
6. Wait for the fork to complete (usually a few seconds)

You now have a separate repository at: `https://github.com/your-org/civiportal-springfield-il`

### Step 5.3: Update City Configuration (Optional)

If the customer needs specific configuration:

1. In the forked repo, navigate to `lib/cityConfig.ts`
2. Click the pencil icon to edit
3. Update the city slug, name, and colors
4. Click **Commit changes**

For most customers, this can be done via environment variables instead (next section).

---

## 6. Deploy to Vercel

Vercel hosts the website and automatically deploys updates.

### Step 6.1: Log into Vercel

1. Go to **https://vercel.com**
2. Click **Log In**
3. Sign in (preferably with GitHub for easy repo access)

### Step 6.2: Create New Project

1. From the Vercel dashboard, click **Add New...** → **Project**
2. You'll see a list of your GitHub repositories
3. Find `civiportal-springfield-il` and click **Import**

### Step 6.3: Configure Environment Variables

**CRITICAL STEP:** Before deploying, you must add environment variables.

1. On the "Configure Project" screen, click **Environment Variables**
2. Add each of the following (click "Add" after each one):

| Name | Value | Notes |
|------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://abcdefgh.supabase.co` | From Step 3.3 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbG...` (the anon key) | From Step 3.3 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` (the service role key) | From Step 3.3 |
| `NEXT_PUBLIC_CITY_SLUG` | `portal` | Usually just "portal" |
| `RATE_LIMIT_SALT` | `springfield-il-2024-randomstring` | Any unique random string |

3. Double-check all values are correct. Typos here cause the site to fail.

### Step 6.4: Deploy

1. Leave other settings as default
2. Click **Deploy**
3. Wait 2-5 minutes for the build to complete
4. You'll see a "Congratulations!" screen when done

### Step 6.5: Verify Deployment

1. Vercel gives you a URL like `civiportal-springfield-il.vercel.app`
2. Click it to open the site
3. You should see the CiviPortal homepage
4. If you see an error, check:
   - Environment variables are correct
   - Supabase project is running
   - Database tables were created

---

## 7. Configure the Domain

Now we connect a nice URL to the Vercel deployment.

### Option A: Subdomain on civiportal.com (Recommended)

This gives the customer a URL like `springfield-il.civiportal.com`

#### Step 7A.1: Add Domain in Vercel

1. In Vercel, go to the project → **Settings** → **Domains**
2. In the text field, enter: `springfield-il.civiportal.com`
3. Click **Add**
4. Vercel will show an error "Invalid Configuration" - this is expected
5. Note the instructions: you need to add a CNAME record

#### Step 7A.2: Add DNS Record in Cloudflare

1. Go to **https://dash.cloudflare.com**
2. Log in and click on **civiportal.com**
3. Click **DNS** in the left sidebar
4. Click **Add record**
5. Fill in:

| Field | Value |
|-------|-------|
| Type | `CNAME` |
| Name | `springfield-il` |
| Target | `cname.vercel-dns.com` |
| Proxy status | **Proxied** (orange cloud) |
| TTL | Auto |

6. Click **Save**

#### Step 7A.3: Verify Domain

1. Wait 5-10 minutes for DNS to propagate
2. Go back to Vercel → **Settings** → **Domains**
3. The domain should now show a green checkmark
4. Visit `https://springfield-il.civiportal.com` to verify it works

### Option B: Customer's Own Domain

If the customer wants to use their own domain (e.g., `transparency.springfield.gov`):

1. Add the domain in Vercel (same as Step 7A.1)
2. Send the customer these instructions:

```
Please add this DNS record to your domain:

Type: CNAME
Name: transparency (or @ for root domain)
Value: cname.vercel-dns.com
TTL: 3600 (or Auto)

Let us know once this is done, and we'll verify the connection.
```

3. Once they confirm, check Vercel to see if the domain shows a green checkmark
4. If using root domain, they may need to add an A record instead - Vercel will show instructions

---

## 8. Create Admin Account

The customer needs an admin account to manage their portal.

### Step 8.1: Create User in Supabase Auth

1. Go to the customer's Supabase project
2. Click **Authentication** in the left sidebar
3. Click **Users** tab
4. Click **Add user** → **Create new user**
5. Fill in:

| Field | Value |
|-------|-------|
| Email | Customer's admin email (e.g., `finance@springfield.gov`) |
| Password | Generate a strong temporary password |
| Auto Confirm User | ✅ Check this box |

6. Click **Create user**
7. **IMPORTANT:** Copy the **User UID** (shown in the user list). It looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

Save the password in the customer's credentials file.

### Step 8.2: Add User to Profiles Table

1. Go to **Table Editor** → **profiles**
2. Click **Insert row**
3. Fill in:

| Column | Value |
|--------|-------|
| id | Paste the User UID from Step 8.1 |
| role | `super_admin` |

4. Click **Save**

### Step 8.3: Verify Admin Access

1. Go to the customer's site (e.g., `https://springfield-il.civiportal.com`)
2. Click **Admin** in the sidebar (or go to `/portal/login`)
3. Log in with the admin email and temporary password
4. You should see the admin dashboard
5. If you get "Access Denied," double-check:
   - The user exists in Authentication → Users
   - The profile row exists with the correct user ID
   - The role is set to `super_admin`

---

## 9. Initial Site Configuration

Configure the site's branding and settings.

### Step 9.1: Log into Admin Panel

1. Go to `https://[customer-domain]/portal/admin`
2. Log in with the admin credentials

### Step 9.2: Update Branding Settings

1. Navigate to **Settings** (or **Branding**)
2. Update:

| Setting | What to Enter |
|---------|---------------|
| City Name | Official name (e.g., "City of Springfield, Illinois") |
| Tagline | Short description (e.g., "Transparent Government, Empowered Citizens") |
| Primary Color | Customer's brand color |
| Accent Color | Secondary color (optional) |

3. Upload logo:
   - Click **Upload Logo**
   - Select the customer's logo file
   - Wait for upload to complete

4. Upload city seal (optional):
   - Click **Upload Seal**
   - Select the seal file

5. Click **Save Changes**

### Step 9.3: Configure Feature Flags

In the admin settings, enable/disable features based on what data the customer will provide:

| Feature | Enable If... |
|---------|--------------|
| Actuals | Customer will upload actual spending data |
| Transactions | Customer will upload individual transactions |
| Vendors | Customer wants vendor search (requires transactions) |
| Revenues | Customer will upload revenue data |

### Step 9.4: Set Fiscal Year

If there's a fiscal year setting:
1. Set the fiscal year start month (usually July or January)
2. Save changes

---

## 10. Help Customer Upload Data

The customer needs to upload their financial data.

### Step 10.1: Provide Data Templates

Send the customer the CSV templates for each data type they'll use:

1. In the admin panel, go to **Upload** (or **Data Management**)
2. Download the template files, or provide these column requirements:

**Budgets Template:**
```csv
fiscal_year,fund_code,fund_name,department_code,department_name,category,account_code,account_name,amount
2024,100,General Fund,101,Police Department,Personnel,51000,Salaries,1500000
```

**Transactions Template:**
```csv
fiscal_year,transaction_date,fund_code,fund_name,department_code,department_name,vendor_name,description,amount
2024,2024-01-15,100,General Fund,101,Police Department,Office Supplies Inc,Office supplies,1234.56
```

### Step 10.2: Upload Data

Either do this yourself or walk the customer through it:

1. Go to **Admin** → **Upload**
2. Select the data type (Budgets, Transactions, etc.)
3. Click **Choose File** and select the CSV
4. Select the upload mode:
   - **Append** - Add to existing data
   - **Replace Year** - Replace one fiscal year's data
   - **Replace All** - Replace everything (use carefully!)
5. Click **Upload**
6. Wait for processing (may take a few minutes for large files)
7. Verify data appears on the public dashboard

### Step 10.3: Verify Data Display

After upload, check:
1. Homepage shows correct totals
2. Budget page shows departments
3. Transactions page shows records (if uploaded)
4. Charts display correctly

---

## 11. Go Live

Once everything is configured and data is uploaded:

### Step 11.1: Final Review

Walk through the site and verify:

- [ ] Logo appears correctly
- [ ] Colors match branding
- [ ] City name is correct everywhere
- [ ] Budget data displays
- [ ] Transaction data displays (if applicable)
- [ ] Revenue data displays (if applicable)
- [ ] Charts render properly
- [ ] Mobile view works
- [ ] Admin can log in
- [ ] No error messages in browser console

### Step 11.2: Publish the Site

1. Go to **Admin** → **Publish** (or **Settings**)
2. Toggle **Published** to ON
3. Click **Save**

The site is now visible to the public.

### Step 11.3: Test Public Access

1. Open an incognito/private browser window
2. Go to the customer's URL
3. Verify the site loads without requiring login
4. Click through all pages to verify everything works

---

## 12. Send Handoff Email

Send the customer their login credentials and next steps.

### Email Template

```
Subject: Your CiviPortal Transparency Dashboard is Live! 🎉

Hi [Customer Name],

Great news! Your financial transparency portal is ready.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Public URL: https://[customer-domain].civiportal.com
Admin Login: https://[customer-domain].civiportal.com/portal/login

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOGIN CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Email: [admin email]
Temporary Password: [password]

⚠️ Please log in and change your password immediately!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT YOU CAN DO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

As an admin, you can:
✓ Upload new budget and transaction data
✓ Update branding (logo, colors)
✓ Invite additional admin users
✓ Publish/unpublish the site
✓ Download data exports

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UPLOADING NEW DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When you have new data to upload:
1. Log into the admin panel
2. Go to Upload
3. Select data type (Budget, Transactions, etc.)
4. Choose your CSV file
5. Select "Append" to add data or "Replace Year" to update a fiscal year
6. Click Upload

Data templates are available in the Upload section.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If you have any questions or run into issues:
Email: [your support email]
Phone: [your support phone]

We're here to help!

Best regards,
[Your name]
CiviPortal Team
```

---

## 13. Pushing Updates to Customers

When you make improvements to CiviPortal, you need to update each customer's site.

### Method 1: GitHub Sync (Easiest)

1. Go to the customer's forked repository on GitHub
   - Example: `https://github.com/your-org/civiportal-springfield-il`

2. You'll see a message like "This branch is X commits behind main"

3. Click **Sync fork**

4. Click **Update branch**

5. Vercel automatically detects the change and redeploys (usually within 2-3 minutes)

6. Verify the site still works after update

### Method 2: Command Line (For Multiple Customers)

If you have many customers, you can script this:

```bash
# Clone the customer's repo (first time only)
git clone https://github.com/your-org/civiportal-springfield-il.git
cd civiportal-springfield-il

# Add the main repo as "upstream" (first time only)
git remote add upstream https://github.com/your-org/civiportal.git

# Pull latest from main repo
git fetch upstream
git merge upstream/main

# Push to customer's repo (triggers Vercel deploy)
git push origin main
```

### Handling Merge Conflicts

If a customer has custom changes and you get merge conflicts:

1. Review the conflicting files
2. Decide whether to keep customer's changes or use new code
3. Edit files to resolve conflicts
4. Commit and push

For simple deployments, avoid customizing individual customer repos - use environment variables instead.

---

## 14. Troubleshooting

### Problem: Site shows "Application Error"

**Causes:**
- Environment variables are wrong or missing
- Supabase project is paused (free tier pauses after inactivity)
- Database tables weren't created

**Solutions:**
1. Check Vercel → Project → Settings → Environment Variables
2. Go to Supabase and make sure project is active
3. Check that all tables exist in Table Editor

### Problem: Admin can't log in

**Causes:**
- User doesn't exist in Supabase Auth
- User not in profiles table
- Role isn't set to `admin` or `super_admin`

**Solutions:**
1. Check Authentication → Users in Supabase
2. Check profiles table has a row with the user's ID
3. Verify role column says `super_admin`

### Problem: Data not showing after upload

**Causes:**
- Upload failed silently
- Data is in wrong format
- Fiscal year filter is hiding data

**Solutions:**
1. Check browser console for errors during upload
2. Look at the raw table data in Supabase Table Editor
3. Try changing the fiscal year selector on the dashboard

### Problem: Domain not working

**Causes:**
- DNS not propagated yet (wait 10-30 minutes)
- CNAME record is wrong
- SSL certificate pending

**Solutions:**
1. Use https://dnschecker.org to verify DNS
2. Double-check CNAME record in Cloudflare
3. In Vercel, check if domain shows "Pending" for SSL

### Problem: Site is slow

**Causes:**
- Large dataset without proper indexing
- Free tier database limits
- Too many simultaneous users

**Solutions:**
1. Upgrade Supabase to Pro plan
2. Check if database needs indexes (contact developer)
3. Consider upgrading Vercel plan

### Problem: Public site shows no data but admin works

**Causes:**
- `is_published` is set to `false` in portal_settings
- RLS policies are missing or broken
- Data exists but for different fiscal year

**Solutions:**
1. Check portal_settings table - set `is_published = true`
2. Verify RLS policies exist (see Section 16)
3. Check fiscal year selector matches uploaded data
4. If policies are missing, re-run the schema SQL

---

## 15. Cost Reference

### Per-Customer Costs

| Service | Free Tier Limits | Pro Plan Cost | When to Upgrade |
|---------|------------------|---------------|-----------------|
| **Supabase** | 500MB database, 2GB bandwidth | $25/month | >500MB data or high traffic |
| **Vercel** | 100GB bandwidth, 100 hours build | $20/month | >100GB bandwidth |
| **Cloudflare** | Unlimited DNS | Free | Never (for DNS) |
| **Subdomain** | N/A | Free | N/A |

### Typical Monthly Cost Per Customer

| Customer Size | Supabase | Vercel | Total |
|---------------|----------|--------|-------|
| Small city (<50k pop) | Free | Free | **$0** |
| Medium city (50-200k) | Free or $25 | Free | **$0-25** |
| Large city (>200k) | $25 | $20 | **$45** |

### Your Overhead Costs

| Service | Cost | Notes |
|---------|------|-------|
| GitHub Organization | Free or $4/user/month | Free works fine |
| Cloudflare (civiportal.com) | ~$10/year | Domain registration |
| Your time | Variable | Main cost! |

---

## 16. Understanding Row Level Security (RLS)

Row Level Security (RLS) is a critical security feature that controls who can see and modify data in the database. **The schema automatically configures RLS correctly**, but you should understand how it works.

### What is RLS?

RLS is like a bouncer at a club - it checks every request to the database and decides whether to allow it based on rules (policies).

Without RLS: Anyone with database access can see all data.
With RLS: Users only see data they're authorized to see.

### How RLS Works in CiviPortal

When you run the schema, it automatically:
1. **Enables RLS** on all 11 tables
2. **Creates security policies** that control access

### The Two API Keys

Supabase gives you two keys that behave differently:

| Key | RLS Behavior | Used For |
|-----|--------------|----------|
| `anon` (public) key | **RLS enforced** - follows all policies | Public website, browser requests |
| `service_role` key | **Bypasses RLS** - full access | Server-side API routes (uploads, deletes) |

This is why:
- The public site uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe to expose)
- API routes use `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### How Data Visibility Works

The key policy is on `portal_settings.is_published`:

```
When is_published = FALSE:
├── Public visitors → See nothing (blocked by RLS)
├── Admins → Can see and edit everything
└── API routes (service_role) → Full access

When is_published = TRUE:
├── Public visitors → Can READ all financial data
├── Admins → Can see and edit everything
└── API routes (service_role) → Full access
```

### RLS Policies by Table

| Table | Public Access | Admin Access |
|-------|---------------|--------------|
| `portal_settings` | Read only when published | Full access |
| `budgets` | Read only when published | Via service_role |
| `actuals` | Read only when published | Via service_role |
| `transactions` | Read only when published | Via service_role |
| `revenues` | Read only when published | Via service_role |
| `profiles` | Own profile only | Own profile only |
| `data_uploads` | None | Read only |
| `admin_audit_log` | None | Read only |
| Rollup tables | Read only when published | Via service_role |

### Common RLS Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| Public site shows no data | `is_published = false` | Set to `true` in portal_settings |
| Public site shows no data | RLS policies missing | Re-run the schema SQL |
| Uploads fail silently | Using anon key instead of service_role | Check `SUPABASE_SERVICE_ROLE_KEY` env var |
| Admin sees "Access Denied" | User not in profiles table | Add user ID to profiles with admin role |
| Admin can view but not edit | Role is `viewer` not `admin` | Update role in profiles table |

### Checking RLS Status

To verify RLS is enabled on a table:

1. Go to Supabase → **Table Editor**
2. Click on a table (e.g., `budgets`)
3. Click **RLS** button (top right)
4. You should see:
   - "RLS Enabled" toggle is ON
   - One or more policies listed

### ⚠️ NEVER Disable RLS

**Do not disable RLS on any table.** This would expose all customer financial data to anyone with the anon key.

If you're troubleshooting and think RLS is the problem:
1. First check `is_published` in portal_settings
2. Check the user exists in profiles with correct role
3. Check you're using the right API key
4. Re-run the schema to restore policies

**If you accidentally disabled RLS:**
1. Go to Table Editor → Select table
2. Click RLS button → Enable RLS
3. Re-run the schema SQL to recreate policies

### Testing RLS is Working

Quick test after setup:

1. Set `is_published = false` in portal_settings
2. Open the public site in incognito window
3. Dashboard should show no data or "not found"
4. Set `is_published = true`
5. Refresh - data should now appear

If data appears when `is_published = false`, RLS is broken. Re-run the schema.

---

## Appendix A: Database Schema

The full SQL schema should be saved as `database/schema.sql` in your repository.

If you don't have this file, contact the lead developer to generate it from the existing production database.

To export schema from existing Supabase:
1. Go to Settings → Database
2. Click "Download schema"

---

## Appendix B: Quick Reference Card

Print this for fast reference:

```
NEW CUSTOMER SETUP - QUICK REFERENCE
====================================

□ 1. Collect: name, email, logo, colors, URL preference
□ 2. Supabase: Create project, run schema, save keys
□ 3. GitHub: Fork repo as civiportal-[slug]
□ 4. Vercel: Import repo, add env vars, deploy
□ 5. Domain: Add CNAME in Cloudflare
□ 6. Admin: Create user in Auth, add to profiles as super_admin
□ 7. Configure: Set branding, upload logo
□ 8. Data: Help customer upload initial data
□ 9. Publish: Toggle site live
□ 10. Email: Send credentials to customer

ENVIRONMENT VARIABLES
---------------------
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_CITY_SLUG
RATE_LIMIT_SALT

ADMIN ROLES
-----------
super_admin - Full access, can manage other users
admin - Can upload data, change settings
viewer - Can view admin area but not change anything
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 2024 | CiviPortal Team | Initial version |
| 1.1 | Dec 2024 | CiviPortal Team | Added RLS section |

---

*End of Document*
