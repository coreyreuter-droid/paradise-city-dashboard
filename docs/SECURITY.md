# CiviPortal Security Model

*Last Updated: January 2025*

This document describes CiviPortal's security architecture and how to verify it.

---

## Security Principles

1. **Data Isolation:** Each customer has their own Supabase project (complete separation)
2. **Defense in Depth:** Multiple layers of protection (RLS, auth, validation)
3. **Least Privilege:** Functions and keys have minimal required permissions
4. **Secure by Default:** Portals are unpublished until explicitly enabled

---

## Row Level Security (RLS)

All data tables have RLS enabled to control access based on `portal_settings.is_published`.

### Public Access (when published)

| Table | Public Can Read | Public Can Write |
|-------|-----------------|------------------|
| portal_settings | Yes (limited fields) | No |
| budgets | Yes | No |
| actuals | Yes | No |
| transactions | Yes | No |
| revenues | Yes | No |
| profiles | No | No |
| rate_limits | No | No |

### Admin Access

Authenticated users with admin roles can read/write data tables via the admin panel.

---

## SECURITY DEFINER Functions

These functions run with elevated privileges and are locked down:

### Allowed Functions

| Function | Purpose | Granted To |
|----------|---------|------------|
| `is_portal_published()` | RLS helper | anon, authenticated |
| `get_fiscal_years_for_table(text)` | Fiscal year lookups | authenticated |
| `get_search_departments_count(text, int)` | Search RPC | anon, authenticated |
| `get_search_vendors_count(text, int)` | Search RPC | anon, authenticated |
| `get_search_transactions_sample(text, int, int)` | Search RPC | anon, authenticated |

### Locked Down

All other SECURITY DEFINER functions have EXECUTE revoked from public roles.

Migration `002_lock_down_security_definer.sql` enforces this.

---

## API Keys

### Anon Key (NEXT_PUBLIC_SUPABASE_ANON_KEY)

- **Exposure:** Public (in browser JavaScript)
- **Permissions:** Read published data only (via RLS)
- **Risk:** Low — can only see what public visitors see

### Service Role Key (SUPABASE_SERVICE_ROLE_KEY)

- **Exposure:** Server-only (never in browser)
- **Permissions:** Bypasses all RLS, full database access
- **Risk:** Critical — must be kept secret

⚠️ **Never put SERVICE_ROLE_KEY in any `NEXT_PUBLIC_*` variable**

In Vercel, set SERVICE_ROLE_KEY for **Production environment only**.

---

## Storage Security

### Bucket Configuration

| Bucket | Public | Allowed Types |
|--------|--------|---------------|
| branding | Yes | PNG, JPEG, WebP |
| project-images | Yes | PNG, JPEG, WebP |

### SVG Files

⚠️ **SVG files are NOT allowed** — they can contain malicious JavaScript (XSS vector).

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

| Endpoint | Limit |
|----------|-------|
| /api/export/* | 30 requests / minute |
| /api/search | 60 requests / minute |

Rate limits are tracked in the `rate_limits` table using hashed identifiers.

---

## Authentication

### Admin Authentication

- Supabase Auth handles login/logout
- Sessions are JWT-based
- Passwords are hashed (bcrypt) by Supabase

### Role Enforcement

Admin routes check roles via `requireAdmin()` middleware:

```typescript
const auth = await requireAdmin(req);
if (!auth.success) return auth.error;
```

Roles are stored in the `profiles` table and verified on each request.

---

## CSRF Protection

Admin mutations include CSRF tokens:

1. Server generates token, stores in HTTP-only cookie
2. Client sends token in request header
3. Server validates token matches cookie

---

## Security Verification

### Automated Checks

Run `scripts/verify-tenant.sql` to check:

- RLS is enabled on all tables
- Required functions exist
- Security policies are in place

**All checks must pass before going live.**

### Manual Verification

Run `scripts/security-check.sql` to verify:

1. **No dangerous SECURITY DEFINER functions exposed**
   - Expected: 0 rows

2. **All data tables have RLS enabled**
   - Expected: All tables show enabled

3. **No public write access to data tables**
   - Expected: 0 rows

### Storage Verification

1. Go to Supabase Storage
2. Click each bucket → Settings
3. Verify:
   - Allowed MIME types do NOT include `image/svg+xml`
   - Public is ON (for branding/project-images)

### Unpublished Test

1. Set `portal_settings.is_published = false`
2. Open site in incognito browser
3. Verify no data is visible
4. Set `is_published = true`
5. Verify data appears

---

## Security Checklist

Before any customer goes live:

- [ ] `verify-tenant.sql` passes (all checks)
- [ ] `security-check.sql` passes (0 dangerous functions)
- [ ] Storage buckets do NOT allow SVG
- [ ] SERVICE_ROLE_KEY is Production-only in Vercel
- [ ] Admin user has strong password
- [ ] Unpublished test passes

---

## Incident Response

If you suspect a security issue:

1. **Immediate:** Set `is_published = false` to hide data
2. **Investigate:** Check Supabase logs and Vercel logs
3. **Escalate:** Contact corey@civiportal.com immediately
4. **Document:** Record what happened and when

---

## Reporting Security Issues

Report security vulnerabilities to: corey@civiportal.com

Do NOT create public GitHub issues for security problems.
