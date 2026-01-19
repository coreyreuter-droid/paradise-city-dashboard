# CiviPortal Architecture

## Overview

CiviPortal is a Next.js 14+ application that provides financial transparency dashboards for local governments. Each customer gets their own deployment with a dedicated Supabase database.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Charts:** Recharts
- **Hosting:** Vercel
- **Error Tracking:** Sentry

---

## Directory Structure

```
├── app/                    # Next.js App Router
│   ├── [citySlug]/        # Public portal pages (dynamic route)
│   │   ├── admin/         # Admin pages (protected)
│   │   ├── overview/      # Main dashboard
│   │   ├── budget/        # Budget pages
│   │   ├── departments/   # Department pages
│   │   └── ...
│   └── api/               # API routes
│       ├── admin/         # Admin-only endpoints
│       ├── export/        # CSV export endpoints
│       └── search/        # Search endpoint
│
├── components/            # React components
│   ├── Admin/            # Admin UI components
│   ├── Analytics/        # Analytics charts
│   ├── Budget/           # Budget visualizations
│   ├── City/             # Public portal components
│   ├── Projects/         # Capital projects
│   └── ui/               # Shared UI primitives
│
├── lib/                   # Shared utilities
│   ├── queries.ts        # Database query functions
│   ├── format.ts         # Formatting utilities
│   ├── auth.ts           # Auth helpers
│   └── ...
│
├── database/             # Database schema
│   └── schema.sql        # Complete schema (run on new projects)
│
├── migrations/           # Incremental migrations
│   ├── 001_*.sql
│   ├── 002_*.sql
│   └── ...
│
└── scripts/              # DevOps scripts
    ├── provision-tenant.sh
    ├── verify-tenant.sql
    └── security-check.sql
```

---

## Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  Next.js    │────▶│  Supabase   │
│             │◀────│  (Vercel)   │◀────│  (Postgres) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
              Server Components   API Routes
              (lib/queries.ts)    (app/api/)
```

**Public pages:** Server Components fetch data via `lib/queries.ts` using the anon key. RLS policies restrict access based on `is_portal_published()`.

**Admin pages:** Server Components verify auth via `lib/auth.ts`. Mutations go through API routes that use the service role key.

---

## Database Design

### Core Tables

| Table | Purpose |
|-------|---------|
| `budgets` | Adopted budget by dept/fund/account |
| `actuals` | Actual spending by period |
| `transactions` | Individual payments |
| `revenues` | Revenue records |
| `portal_settings` | Site config, branding, feature flags |
| `profiles` | User roles (admin, super_admin) |

### Rollup Tables (pre-aggregated)

| Table | Aggregates |
|-------|------------|
| `budget_actuals_year_department` | Budget vs actuals by year + dept |
| `transaction_year_department` | Transaction totals by year + dept |
| `transaction_year_vendor` | Transaction totals by year + vendor |

### Views

| View | Purpose |
|------|---------|
| `budget_actuals_year_totals` | Year-level budget/actual totals |
| `transaction_year_totals` | Year-level transaction totals |
| `revenue_year_totals` | Year-level revenue totals |

### Security

- **RLS enabled** on all tables
- `is_portal_published()` gates public access
- Admin access requires `profiles.role IN ('admin', 'super_admin')`
- SECURITY DEFINER functions locked down (see migration 002)

---

## Key Files

### Environment Variables

| File | Purpose |
|------|---------|
| `lib/env.public.ts` | Public vars (safe for client) |
| `lib/env.server.ts` | Server secrets (never import client-side) |

### Data Queries

| File | Purpose |
|------|---------|
| `lib/queries.ts` | All database queries (used by Server Components) |
| `lib/adminProjectQueries.ts` | Capital projects admin queries |

### Formatting

| File | Purpose |
|------|---------|
| `lib/format.ts` | Currency, percent, date formatting |
| `lib/chartDomain.ts` | Chart axis domain calculations |

### Auth

| File | Purpose |
|------|---------|
| `lib/auth.ts` | `requireAdmin()`, `getSession()` helpers |
| `lib/supabase.ts` | Anon client (public queries) |
| `lib/supabaseService.ts` | Service role client (admin mutations) |

---

## URL Structure

```
/[citySlug]/overview          # Main dashboard
/[citySlug]/budget            # Budget breakdown
/[citySlug]/departments       # Department list
/[citySlug]/departments/[id]  # Department detail
/[citySlug]/transactions      # Transaction search
/[citySlug]/vendors           # Vendor list
/[citySlug]/revenues          # Revenue breakdown
/[citySlug]/download          # CSV exports
/[citySlug]/admin             # Admin dashboard
/[citySlug]/admin/upload      # Data upload
/[citySlug]/admin/branding    # Site settings
```

The `[citySlug]` is validated in `app/[citySlug]/layout.tsx` against `NEXT_PUBLIC_CITY_SLUG`. Invalid slugs return 404.

---

## Admin Upload Flow

1. Admin uploads CSV via `/admin/upload`
2. `app/api/admin/upload/route.ts` validates and inserts data
3. Rollup tables are refreshed via SECURITY DEFINER functions
4. Data becomes visible on public portal (if `is_published = true`)

---

## Feature Flags

Controlled in `portal_settings`:

| Flag | Controls |
|------|----------|
| `is_published` | Public visibility of entire portal |
| `enable_budget` | Budget pages |
| `enable_actuals` | Actuals data |
| `enable_transactions` | Transaction search |
| `enable_vendors` | Vendor pages |
| `enable_revenues` | Revenue pages |

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/api/search` | 60/min per IP |
| `/api/export/count` | 30/min per IP |
| `/api/export/totals` | 30/min per IP |

Implemented via `lib/rateLimit.ts` + `rate_limits` table.

---

## Deployment

Each customer = separate Vercel project + Supabase project.

1. Run `scripts/provision-tenant.sh` or manually execute schema + migrations
2. Create storage bucket (`branding`)
3. Create admin user
4. Deploy to Vercel with env vars
5. Verify with `scripts/verify-tenant.sql`

See `CUSTOMER_ONBOARDING_GUIDE.md` for full instructions.

---

## Testing

```bash
npm test              # Run Jest tests
npm run test:watch    # Watch mode
```

Tests live in `__tests__/` mirroring the source structure.

---

## Common Tasks

### Add a new page

1. Create `app/[citySlug]/your-page/page.tsx`
2. Fetch data in Server Component via `lib/queries.ts`
3. Create client component in `components/City/`

### Add a new API route

1. Create `app/api/your-route/route.ts`
2. For admin routes: check auth with `requireAdmin()`
3. For public routes: add rate limiting

### Modify database schema

1. Add migration in `migrations/00X_*.sql`
2. Update `database/schema.sql` for new customers
3. Update `scripts/verify-tenant.sql` if needed
4. Run migration on existing databases

---

## Security Checklist

- [ ] RLS enabled on all data tables
- [ ] SECURITY DEFINER functions locked down (migration 002)
- [ ] Service role key only in `SUPABASE_SERVICE_ROLE_KEY` (not `NEXT_PUBLIC_*`)
- [ ] Storage bucket does NOT allow SVG
- [ ] API routes have rate limiting
- [ ] Admin routes check auth
