# CiviPortal

Financial transparency platform for local governments.

## Features

- **Budget & Actuals** — Adopted budgets vs spending by department and fund
- **Transactions Explorer** — Line-item spending with search and filters
- **Vendor Analysis** — Spending breakdown by vendor (optional)
- **Revenue Dashboards** — Revenue by source with trends
- **Capital Projects** — Infrastructure investments with images and timelines
- **Customizable Landing Page** — Hero images, leadership messages, and story sections
- **White-label Branding** — Custom colors, logos, and messaging per customer

## Quick Links

| Document | Purpose |
|----------|---------|
| [ONBOARDING.md](docs/ONBOARDING.md) | New customer setup (start here) |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical architecture & code structure |
| [SECURITY.md](docs/SECURITY.md) | Security model & verification |
| [ADMIN_AUTH_ROLES.md](docs/ADMIN_AUTH_ROLES.md) | User roles & permissions |
| [CONVENTIONS.md](docs/CONVENTIONS.md) | Coding standards |

## Tech Stack

- **Framework:** Next.js 16 (App Router)
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
    admin/             # Admin panel pages
    projects/          # Capital projects pages
  api/                 # API endpoints
components/            # React components
  Admin/               # Admin panel components
  City/                # Public portal components
  Projects/            # Capital projects components
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
psql < migrations/006_auto_create_profile.sql
psql < migrations/007_add_enable_projects.sql

# 3. Verify setup
psql < scripts/verify-tenant.sql
```

### Storage Buckets

Create these buckets in Supabase Storage:

| Bucket | Public | Purpose |
|--------|--------|---------|
| `branding` | Yes | Logo, seal, hero images, leader photos |
| `project-images` | Yes | Capital project photos |

**Allowed MIME types:** `image/png`, `image/jpeg`, `image/webp`

⚠️ Do NOT allow SVG files (security risk)

## Admin Panel Features

The admin panel (`/portal/admin`) includes:

| Page | Purpose |
|------|---------|
| **Overview** | Dashboard with data status and quick stats |
| **Onboarding** | Guided setup checklist for new portals |
| **Data Upload** | CSV imports for budgets, actuals, transactions, revenues |
| **Upload History** | Logs of past imports with row counts and errors |
| **Branding & Settings** | Portal configuration with collapsible sections |
| **Capital Projects** | Manage infrastructure projects with images |
| **Users & Roles** | Invite users and manage permissions |
| **Help & FAQs** | Self-service documentation for staff |

### Branding Settings Sections

The branding page uses collapsible sections for organization:

1. **Publish Status** — Draft/Published toggle (always visible)
2. **Modules Enable/Disable** — Toggle data modules
3. **Branding** — Gov name, tagline, colors, images
4. **Landing Page Sections** — Toggle visibility of landing page sections
5. **Story Sections** — Hero message, gov description, year-in-review
6. **Leadership** — Leader name, title, message, photo
7. **Gov Stats** — Population, employees, area
8. **Capital Projects** — Highlight text and featured projects
9. **Fiscal Year** — Start month, day, and public label

### Image Upload Specs

| Image Type | Recommended Size | Max File Size |
|------------|-----------------|---------------|
| Logo | 96×96 (square) | 5MB |
| Seal | 96×96 (square) | 5MB |
| Hero | 1920×600 (landscape) | 5MB |
| Leader Photo | 112×112 (square) | 5MB |
| Featured Projects | 800×450 (landscape) | 5MB |
| Project Images | 800×450 (landscape) | 5MB |

Supported formats: PNG, JPEG, WebP

## Data Modules

| Module | Description | Required Data |
|--------|-------------|---------------|
| Budget & Actuals | Spending vs budget by department | budgets, actuals |
| Transactions | Line-item spending explorer | transactions |
| Vendors | Vendor-level spending (requires Transactions) | transactions with vendor field |
| Revenues | Revenue by source dashboards | revenues |
| Capital Projects | Infrastructure investments | capital_projects table |

## Deployment

Production deployments happen automatically via Vercel when pushing to `main`.

Staging deployments happen when pushing to `staging`.

## Changelog

### January 2025
- Added Capital Projects module with images and status tracking
- Refactored branding settings into collapsible sections
- Added auto-resizing textareas for content fields
- Added visual image upload drop zones with immediate upload
- Moved Fiscal Year to its own settings section
- Updated onboarding checklist with new steps
- Expanded Help & FAQ documentation

## Support

- Email: hello@civiportal.com
- Escalation: corey@civiportal.com

## License

Proprietary - CiviPortal Inc.
