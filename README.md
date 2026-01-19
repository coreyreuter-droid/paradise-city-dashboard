# CiviPortal

Financial transparency platform for local governments.

## Quick Links

| Document | Purpose |
|----------|---------|
| [ONBOARDING.md](docs/ONBOARDING.md) | New customer setup (start here) |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical architecture & code structure |
| [SECURITY.md](docs/SECURITY.md) | Security model & verification |
| [ADMIN_AUTH_ROLES.md](docs/ADMIN_AUTH_ROLES.md) | User roles & permissions |
| [CONVENTIONS.md](docs/CONVENTIONS.md) | Coding standards |

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Hosting:** Vercel
- **Charts:** Recharts
- **Styling:** Tailwind CSS

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase project (or access to staging)

### Setup

```bash
# Clone the repo
git clone https://github.com/coreyreuter-droid/paradise-city-dashboard.git
cd paradise-city-dashboard

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (prod) | Service role key (production only) |
| `NEXT_PUBLIC_CITY_SLUG` | Yes | Always `portal` |
| `RATE_LIMIT_SALT` | Yes | Random 32-char string for rate limiting |

### Run Development Server

```bash
npm run dev
```

Open http://localhost:3000/portal

### Run Tests

```bash
npm test
```

### Build for Production

```bash
npm run build
```

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Cloudflare    │────▶│     Vercel      │────▶│    Supabase     │
│   (DNS)         │     │   (Next.js)     │     │   (Database)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Single-tenant model:** Each customer gets their own:
- Supabase project (complete data isolation)
- Vercel deployment (from forked repo)
- Subdomain ([customer].civiportal.com)

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Key Directories

```
app/                    # Next.js pages & API routes
  [citySlug]/          # Public portal pages
  api/                 # API endpoints
components/            # React components
  Admin/               # Admin panel components
  City/                # Public portal components
lib/                   # Utilities, queries, config
database/              # SQL schema
migrations/            # Database migrations (run in order)
scripts/               # Setup & verification scripts
```

## Database Setup

For new customers, see [ONBOARDING.md](docs/ONBOARDING.md).

For development:

```bash
# 1. Run base schema
psql < database/schema.sql

# 2. Run migrations in order
psql < migrations/002_lock_down_security_definer.sql
psql < migrations/003_search_counts_rpc.sql
psql < migrations/004_add_totals_views.sql

# 3. Verify setup
psql < scripts/verify-tenant.sql
```

## Deployment

Production deployments happen automatically via Vercel when pushing to `main`.

Staging deployments happen when pushing to `staging`.

## Support

- Email: hello@civiportal.com
- Escalation: corey@civiportal.com

## License

Proprietary - CiviPortal Inc.
