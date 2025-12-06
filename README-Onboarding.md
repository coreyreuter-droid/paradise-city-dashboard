# CiviPortal Onboarding — New City

This doc is for **developers** standing up a new city on CiviPortal using **Supabase + Vercel**.

The codebase assumes:

- One Supabase project **per city**
- One Vercel deployment **per city**
- Tables: `budgets`, `actuals`, `transactions`, `revenues`, `portal_settings`, `data_uploads`, `profiles`
- Supabase Auth (email / magic link)

If any of this is missing or mis-named, the app will not behave correctly.

---

## A. Supabase Setup

### 1. Create a new Supabase project

1. Go to Supabase → **New Project**
2. Name it after the city (e.g. `springfield-budget`)
3. Save:
   - **Project URL**
   - **anon public key**
   - **service role key**

You’ll need those for environment variables.

---

### 2. Core tables (budgets, actuals, transactions, revenues)

Create the following tables with **exact names and columns**.

You can adjust indexes / primary keys as you like, but **do not rename or drop these columns**.

#### `budgets`

Shape matches `BudgetRow` in `lib/schema.ts`:

```sql
create table public.budgets (
  fiscal_year      integer       not null,
  fund_code        text,
  fund_name        text,
  department_code  text,
  department_name  text,
  category         text,
  account_code     text,
  account_name     text,
  amount           numeric       not null
);

