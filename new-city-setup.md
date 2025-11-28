🏙 New City Setup Guide

This assumes you’re deploying a new city using the same codebase, with its own Supabase project and its own deployment (Vercel or similar).

1. Create a new Supabase project

Go to Supabase → New Project

Name it after the city (e.g. springfield-budget)

Note the:

Project URL

anon public key

You’ll use those as env vars.

2. Apply the database schema

In the new Supabase project, create the tables:

budgets

actuals

transactions

Each should match the columns your app expects (what you used for Paradise). Example:

budgets

fiscal_year (int)

department_name (text)

amount (numeric)

actuals

fiscal_year (int)

department_name (text)

amount (numeric)

transactions

date (date or timestamptz)

fiscal_year (int)

fund_name (text)

department_name (text)

vendor (text)

description (text)

amount (numeric)

You can either:

Reuse the SQL you already used for Paradise, or

Manually create the tables from the UI to match.

3. Upload initial data

Use your admin upload UI in the app (once deployed) or insert via Supabase directly.

You need three CSVs:

Budgets

Actuals

Transactions

They must match the expected headers you already standardized on in this project.

4. Create a new deployment (e.g. Vercel)

In Vercel, click New Project

Select the same GitHub repo (paradise-city-dashboard)

Name the project after the city (e.g. springfield-dashboard)

5. Set environment variables for that city

In that Vercel project’s settings, set:

Supabase

NEXT_PUBLIC_SUPABASE_URL → Supabase project URL

NEXT_PUBLIC_SUPABASE_ANON_KEY → Supabase anon key

City identity

NEXT_PUBLIC_CITY_SLUG → e.g. springfield

NEXT_PUBLIC_CITY_NAME → e.g. City of Springfield

NEXT_PUBLIC_CITY_TAGLINE → e.g. Open budget and spending transparency

Theme (optional but recommended)

NEXT_PUBLIC_CITY_PRIMARY_COLOR → e.g. #1e3a8a

NEXT_PUBLIC_CITY_PRIMARY_TEXT → e.g. #ffffff

NEXT_PUBLIC_CITY_ACCENT_COLOR → e.g. #3b82f6

Deploy.

6. Verify the new city dashboard

Once deployed:

Go to the app URL (e.g. https://springfield-dashboard.vercel.app/springfield)

Check:

Sidebar shows the city name

Tagline matches the env var

Colors match the theme

Budget / analytics / transactions load using the new Supabase data

If something looks off, double-check:

The CITY_CONFIG env vars

Supabase table names + columns

That you deployed with the correct envs

7. (Optional) Point a real domain

For production:

Set up DNS → budget.city.gov or similar

Point it to the Vercel project

Now the city has its own public-facing budget portal
