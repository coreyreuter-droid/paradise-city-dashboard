# Admin Auth & Roles — CiviPortal

This document explains how **admin login and roles** work in this codebase, based solely on the actual implementation.

It covers:

- How admins log in
- Where roles are stored
- How admin routes are protected (client + API)
- What each role can do
- How to create and manage admins safely

---

## 1. Roles & Where They Live

Roles are stored in the `profiles` table:

- Table: `public.profiles`
- Columns (minimum):
  - `id` — `uuid`, primary key, references `auth.users.id`
  - `role` — `text | null`
  - `created_at` — `timestamptz`, default `now()`

The code expects these `role` values:

- `"super_admin"`
- `"admin"`
- `"viewer"`
- `null` (no explicit role yet)

### Role meanings

Based on the API routes under `app/api/admin/users/*` and `app/api/admin/*`:

- **super_admin**
  - Full control over users and roles:
    - Invite new users
    - Change user roles
    - Remove admin access
    - Delete users
  - Full admin capabilities:
    - Upload data
    - Manage branding / hero image
  - Protected from:
    - Accidentally demoting themselves
    - Removing themselves
    - Removing the **last** super_admin

- **admin**
  - Can:
    - Access all admin pages (gated by `AdminGuard`)
    - Upload budgets, actuals, transactions, revenues
    - Upload branding / hero image
  - Cannot:
    - Invite new users
    - Change roles
    - Remove admin access from others
    - Delete users

- **viewer / null**
  - Treated as **non-admin**:
    - Can log in
    - Can use the public portal
    - Cannot access admin routes (blocked by `AdminGuard` and admin API role checks)

---

## 2. How Login Works

### Login page

- Path: `app/[citySlug]/login/page.tsx`
- Client: `components/City/LoginClient.tsx`

Key behavior in `LoginClient`:

1. **On mount**, it checks if the user is already logged in:

   ```ts
   const {
     data: { user },
     error: userError,
   } = await supabase.auth.getUser();
