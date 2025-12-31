-- ============================================================================
-- CIVIPORTAL DATABASE SCHEMA
-- ============================================================================
-- Version: 2.0
-- Last Updated: December 2024
-- 
-- This schema is an EXACT replica of the production CiviPortal database.
-- Run this in a NEW Supabase project's SQL Editor to set up a customer.
--
-- INSTRUCTIONS:
-- 1. Create a new Supabase project
-- 2. Go to SQL Editor
-- 3. Paste this entire file
-- 4. Click "Run" (or Cmd+Enter / Ctrl+Enter)
-- 5. Verify tables exist in Table Editor
--
-- IMPORTANT: Only run this ONCE on a fresh database.
-- ============================================================================


-- ============================================================================
-- EXTENSIONS
-- ============================================================================
-- Enable trigram extension for fuzzy text search on vendor/description

CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
-- Stores user roles. Links to Supabase Auth users.

CREATE TABLE public.profiles (
  id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role = ANY (ARRAY['admin', 'viewer', 'super_admin'])),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 2. PORTAL SETTINGS TABLE
-- ============================================================================
-- Stores all site configuration, branding, feature flags, and content.

CREATE TABLE public.portal_settings (
  id INTEGER NOT NULL DEFAULT 1,
  
  -- Basic Info
  city_name TEXT NOT NULL DEFAULT 'Paradise City',
  tagline TEXT,
  
  -- Colors
  primary_color TEXT DEFAULT '#0f172a',
  accent_color TEXT DEFAULT '#0ea5e9',
  background_color TEXT DEFAULT '#f8fafc',
  
  -- Images
  logo_url TEXT,
  hero_image_url TEXT,
  seal_url TEXT,
  hero_message TEXT,
  
  -- Story Section
  story_city_description TEXT,
  story_year_achievements TEXT,
  story_capital_projects TEXT,
  
  -- Leadership Section
  leader_name TEXT,
  leader_title TEXT,
  leader_message TEXT,
  leader_photo_url TEXT,
  
  -- Capital Projects
  project1_title TEXT,
  project1_summary TEXT,
  project1_image_url TEXT,
  project2_title TEXT,
  project2_summary TEXT,
  project2_image_url TEXT,
  project3_title TEXT,
  project3_summary TEXT,
  project3_image_url TEXT,
  
  -- Statistics
  stat_population TEXT,
  stat_employees TEXT,
  stat_square_miles TEXT,
  stat_annual_budget TEXT,
  
  -- Section Visibility Toggles
  show_leadership BOOLEAN NOT NULL DEFAULT true,
  show_story BOOLEAN NOT NULL DEFAULT true,
  show_year_review BOOLEAN NOT NULL DEFAULT true,
  show_capital_projects BOOLEAN NOT NULL DEFAULT true,
  show_stats BOOLEAN NOT NULL DEFAULT true,
  show_projects BOOLEAN NOT NULL DEFAULT true,
  
  -- Feature Flags
  is_published BOOLEAN NOT NULL DEFAULT false,
  enable_budget BOOLEAN NOT NULL DEFAULT true,
  enable_actuals BOOLEAN NOT NULL DEFAULT true,
  enable_transactions BOOLEAN NOT NULL DEFAULT false,
  enable_vendors BOOLEAN NOT NULL DEFAULT false,
  enable_revenues BOOLEAN NOT NULL DEFAULT false,
  
  -- Fiscal Year Config
  fiscal_year_start_month SMALLINT,
  fiscal_year_start_day SMALLINT,
  fiscal_year_label TEXT,
  
  -- Timestamps
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT portal_settings_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 3. BUDGETS TABLE
-- ============================================================================
-- Stores adopted budget data by fiscal year.

CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  fiscal_year INTEGER NOT NULL,
  fund_code TEXT,
  fund_name TEXT NOT NULL,
  department_code TEXT,
  department_name TEXT NOT NULL,
  category TEXT,
  account_code TEXT,
  account_name TEXT,
  amount NUMERIC NOT NULL,
  CONSTRAINT budgets_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 4. ACTUALS TABLE
-- ============================================================================
-- Stores actual spending data by period.

CREATE TABLE public.actuals (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  fiscal_year INTEGER NOT NULL,
  period TEXT NOT NULL,
  fund_code TEXT,
  fund_name TEXT NOT NULL,
  department_code TEXT,
  department_name TEXT NOT NULL,
  category TEXT,
  account_code TEXT,
  account_name TEXT,
  amount NUMERIC NOT NULL,
  fiscal_period INTEGER CHECK (fiscal_period IS NULL OR (fiscal_period >= 1 AND fiscal_period <= 12)),
  CONSTRAINT actuals_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.actuals ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 5. TRANSACTIONS TABLE
-- ============================================================================
-- Stores individual payment/transaction records.

CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  fiscal_year INTEGER NOT NULL,
  fund_code TEXT,
  fund_name TEXT NOT NULL,
  department_code TEXT,
  department_name TEXT NOT NULL,
  account_code TEXT,
  account_name TEXT,
  vendor TEXT,
  description TEXT,
  amount NUMERIC NOT NULL,
  search_fts TSVECTOR DEFAULT to_tsvector('english', (COALESCE(vendor, '') || ' ' || COALESCE(description, ''))),
  fiscal_period INTEGER CHECK (fiscal_period IS NULL OR (fiscal_period >= 1 AND fiscal_period <= 12)),
  CONSTRAINT transactions_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 6. REVENUES TABLE
-- ============================================================================
-- Stores revenue data by source and period.

CREATE TABLE public.revenues (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  fiscal_year INTEGER NOT NULL,
  period TEXT NOT NULL,
  fund_code TEXT,
  fund_name TEXT,
  department_code TEXT,
  department_name TEXT,
  category TEXT,
  account_code TEXT,
  account_name TEXT,
  amount NUMERIC NOT NULL,
  fiscal_period INTEGER CHECK (fiscal_period IS NULL OR (fiscal_period >= 1 AND fiscal_period <= 12)),
  CONSTRAINT revenues_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 7. ROLLUP TABLES (Pre-aggregated for performance)
-- ============================================================================

-- Budget vs Actuals by Department (used on Overview/Analytics pages)
CREATE TABLE public.budget_actuals_year_department (
  fiscal_year INTEGER NOT NULL,
  department_name TEXT NOT NULL,
  budget_amount NUMERIC NOT NULL DEFAULT 0,
  actual_amount NUMERIC NOT NULL DEFAULT 0,
  CONSTRAINT budget_actuals_year_department_pkey PRIMARY KEY (fiscal_year, department_name)
);

-- Enable RLS
ALTER TABLE public.budget_actuals_year_department ENABLE ROW LEVEL SECURITY;


-- Transaction totals by Department
CREATE TABLE public.transaction_year_department (
  fiscal_year INTEGER NOT NULL,
  department_name TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  txn_count BIGINT NOT NULL,
  CONSTRAINT transaction_year_department_pkey PRIMARY KEY (fiscal_year, department_name)
);

-- Enable RLS
ALTER TABLE public.transaction_year_department ENABLE ROW LEVEL SECURITY;


-- Transaction totals by Vendor
CREATE TABLE public.transaction_year_vendor (
  fiscal_year INTEGER NOT NULL,
  vendor TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  txn_count BIGINT NOT NULL,
  first_txn_date DATE,
  last_txn_date DATE,
  CONSTRAINT transaction_year_vendor_pkey PRIMARY KEY (fiscal_year, vendor)
);

-- Enable RLS
ALTER TABLE public.transaction_year_vendor ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 8. ADMIN/AUDIT TABLES
-- ============================================================================

-- Upload History (tracks all data uploads)
CREATE TABLE public.data_uploads (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  table_name TEXT NOT NULL,
  mode TEXT NOT NULL,
  row_count INTEGER NOT NULL,
  fiscal_year INTEGER,
  filename TEXT,
  admin_identifier TEXT
);

-- Enable RLS
ALTER TABLE public.data_uploads ENABLE ROW LEVEL SECURITY;


-- Admin Audit Log (tracks admin actions for security)
CREATE TABLE public.admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  city_slug TEXT,
  actor_user_id UUID,
  actor_email TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_table TEXT,
  fiscal_year INTEGER,
  mode TEXT,
  filename TEXT,
  rows_affected INTEGER,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  error_message TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 9. RATE LIMITS TABLE
-- ============================================================================

CREATE TABLE public.rate_limits (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 10. INDEXES
-- ============================================================================

-- Actuals indexes
CREATE INDEX actuals_fiscal_year_idx ON public.actuals (fiscal_year);
CREATE INDEX actuals_fiscal_year_category_idx ON public.actuals (fiscal_year, category);
CREATE INDEX actuals_fiscal_year_department_idx ON public.actuals (fiscal_year, department_name);
CREATE INDEX idx_actuals_department_name ON public.actuals (department_name);

-- Budgets indexes
CREATE INDEX budgets_fiscal_year_idx ON public.budgets (fiscal_year);
CREATE INDEX budgets_fiscal_year_category_idx ON public.budgets (fiscal_year, category);
CREATE INDEX budgets_fiscal_year_department_idx ON public.budgets (fiscal_year, department_name);
CREATE INDEX idx_budgets_department_name ON public.budgets (department_name);

-- Transactions indexes (many for search performance)
CREATE INDEX idx_transactions_fiscal_year ON public.transactions (fiscal_year);
CREATE INDEX idx_transactions_date ON public.transactions (date);
CREATE INDEX idx_transactions_department_name ON public.transactions (department_name);
CREATE INDEX idx_transactions_fiscal_year_date ON public.transactions (fiscal_year, date DESC);
CREATE INDEX idx_transactions_fiscal_year_department_name ON public.transactions (fiscal_year, department_name);
CREATE INDEX idx_transactions_year_vendor ON public.transactions (fiscal_year, vendor);
CREATE INDEX idx_transactions_vendor_lower ON public.transactions (lower(vendor));
CREATE INDEX idx_transactions_description_lower ON public.transactions (lower(description));
CREATE INDEX idx_transactions_search_fts ON public.transactions USING gin (search_fts);
CREATE INDEX transactions_vendor_trgm_idx ON public.transactions USING gin (vendor gin_trgm_ops);
CREATE INDEX transactions_description_trgm_idx ON public.transactions USING gin (description gin_trgm_ops);
CREATE INDEX transactions_fiscal_year_account_idx ON public.transactions (fiscal_year, account_code);
CREATE INDEX transactions_fiscal_year_fund_idx ON public.transactions (fiscal_year, fund_code);

-- Revenues indexes
CREATE INDEX revenues_fiscal_year_idx ON public.revenues (fiscal_year);

-- Rollup table indexes
CREATE INDEX idx_bayd_year_budget ON public.budget_actuals_year_department (fiscal_year, budget_amount DESC);
CREATE INDEX idx_bayd_year_actual ON public.budget_actuals_year_department (fiscal_year, actual_amount DESC);
CREATE INDEX idx_tyd_year_total ON public.transaction_year_department (fiscal_year, total_amount DESC);
CREATE INDEX idx_tyv_year_total ON public.transaction_year_vendor (fiscal_year, total_amount DESC);
CREATE INDEX idx_tyv_vendor ON public.transaction_year_vendor (vendor);

-- Admin audit log indexes
CREATE INDEX admin_audit_log_created_at_idx ON public.admin_audit_log (created_at DESC);
CREATE INDEX admin_audit_log_action_idx ON public.admin_audit_log (action);
CREATE INDEX admin_audit_log_table_year_idx ON public.admin_audit_log (target_table, fiscal_year);

-- Rate limits index
CREATE INDEX idx_rate_limits_key_created ON public.rate_limits (key, created_at);


-- ============================================================================
-- 11. FUNCTIONS
-- ============================================================================

-- Check if portal is published (used by RLS policies)
CREATE OR REPLACE FUNCTION public.is_portal_published()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT is_published FROM portal_settings LIMIT 1), false);
$$;


-- Get fiscal years for a table (admin use)
CREATE OR REPLACE FUNCTION public.get_fiscal_years_for_table(_table TEXT)
RETURNS TABLE(fiscal_year INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Require admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'admin required';
  END IF;

  -- Restrict to allowed tables
  IF _table NOT IN ('budgets', 'actuals', 'transactions', 'revenues') THEN
    RAISE EXCEPTION 'invalid table';
  END IF;

  -- Return distinct fiscal years, newest first
  RETURN QUERY EXECUTE format(
    'SELECT DISTINCT fiscal_year::int
     FROM public.%I
     WHERE fiscal_year IS NOT NULL
     ORDER BY fiscal_year DESC',
    _table
  );
END;
$$;


-- Refresh budget/actuals rollup for a fiscal year
CREATE OR REPLACE FUNCTION public.refresh_budget_actuals_rollup_for_year(_fy INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.budget_actuals_year_department
  WHERE fiscal_year = _fy;

  INSERT INTO public.budget_actuals_year_department (
    fiscal_year,
    department_name,
    budget_amount,
    actual_amount
  )
  WITH
  b AS (
    SELECT fiscal_year, department_name, SUM(amount)::numeric AS budget_amount
    FROM public.budgets
    WHERE fiscal_year = _fy
    GROUP BY fiscal_year, department_name
  ),
  a AS (
    SELECT fiscal_year, department_name, SUM(amount)::numeric AS actual_amount
    FROM public.actuals
    WHERE fiscal_year = _fy
    GROUP BY fiscal_year, department_name
  )
  SELECT
    COALESCE(b.fiscal_year, a.fiscal_year),
    COALESCE(b.department_name, a.department_name),
    COALESCE(b.budget_amount, 0),
    COALESCE(a.actual_amount, 0)
  FROM b
  FULL OUTER JOIN a
    ON a.fiscal_year = b.fiscal_year
   AND a.department_name = b.department_name;
END;
$$;


-- Alias function (same as above, different name for compatibility)
CREATE OR REPLACE FUNCTION public.refresh_budget_actuals_year_department_for_year(_fy INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.budget_actuals_year_department
  WHERE fiscal_year = _fy;

  INSERT INTO public.budget_actuals_year_department (
    fiscal_year,
    department_name,
    budget_amount,
    actual_amount
  )
  WITH
  b AS (
    SELECT fiscal_year, department_name, SUM(amount)::numeric AS budget_amount
    FROM public.budgets
    WHERE fiscal_year = _fy
    GROUP BY fiscal_year, department_name
  ),
  a AS (
    SELECT fiscal_year, department_name, SUM(amount)::numeric AS actual_amount
    FROM public.actuals
    WHERE fiscal_year = _fy
    GROUP BY fiscal_year, department_name
  )
  SELECT
    COALESCE(b.fiscal_year, a.fiscal_year) AS fiscal_year,
    COALESCE(b.department_name, a.department_name) AS department_name,
    COALESCE(b.budget_amount, 0)::numeric AS budget_amount,
    COALESCE(a.actual_amount, 0)::numeric AS actual_amount
  FROM b
  FULL OUTER JOIN a
    ON a.fiscal_year = b.fiscal_year
   AND a.department_name = b.department_name;
END;
$$;


-- Refresh transaction rollups for a fiscal year
CREATE OR REPLACE FUNCTION public.refresh_transaction_rollups_for_year(_fy INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.transaction_year_department WHERE fiscal_year = _fy;
  DELETE FROM public.transaction_year_vendor WHERE fiscal_year = _fy;

  INSERT INTO public.transaction_year_department (
    fiscal_year,
    department_name,
    txn_count,
    total_amount
  )
  SELECT
    fiscal_year,
    department_name,
    COUNT(*)::int AS txn_count,
    SUM(amount)::numeric AS total_amount
  FROM public.transactions
  WHERE fiscal_year = _fy
  GROUP BY fiscal_year, department_name;

  INSERT INTO public.transaction_year_vendor (
    fiscal_year,
    vendor,
    txn_count,
    total_amount
  )
  SELECT
    fiscal_year,
    vendor,
    COUNT(*)::int AS txn_count,
    SUM(amount)::numeric AS total_amount
  FROM public.transactions
  WHERE fiscal_year = _fy
  GROUP BY fiscal_year, vendor;
END;
$$;


-- Recompute budget/actuals summaries (alternate version with UPSERT)
CREATE OR REPLACE FUNCTION public.recompute_budget_actuals_summaries_for_year(p_year INTEGER)
RETURNS VOID
LANGUAGE sql
AS $$
  INSERT INTO public.budget_actuals_year_department AS t (
    fiscal_year,
    department_name,
    budget_amount,
    actual_amount
  )
  SELECT
    p_year AS fiscal_year,
    dept.department_name,
    COALESCE(b.budget_amount, 0) AS budget_amount,
    COALESCE(a.actual_amount, 0) AS actual_amount
  FROM (
    SELECT DISTINCT COALESCE(NULLIF(TRIM(department_name), ''), 'Unspecified') AS department_name
    FROM public.budgets
    WHERE fiscal_year = p_year
    UNION
    SELECT DISTINCT COALESCE(NULLIF(TRIM(department_name), ''), 'Unspecified') AS department_name
    FROM public.actuals
    WHERE fiscal_year = p_year
  ) dept
  LEFT JOIN (
    SELECT
      fiscal_year,
      COALESCE(NULLIF(TRIM(department_name), ''), 'Unspecified') AS department_name,
      SUM(amount) AS budget_amount
    FROM public.budgets
    WHERE fiscal_year = p_year
    GROUP BY fiscal_year, COALESCE(NULLIF(TRIM(department_name), ''), 'Unspecified')
  ) b
    ON b.fiscal_year = p_year AND b.department_name = dept.department_name
  LEFT JOIN (
    SELECT
      fiscal_year,
      COALESCE(NULLIF(TRIM(department_name), ''), 'Unspecified') AS department_name,
      SUM(amount) AS actual_amount
    FROM public.actuals
    WHERE fiscal_year = p_year
    GROUP BY fiscal_year, COALESCE(NULLIF(TRIM(department_name), ''), 'Unspecified')
  ) a
    ON a.fiscal_year = p_year AND a.department_name = dept.department_name
  ON CONFLICT (fiscal_year, department_name) DO UPDATE
  SET
    budget_amount = EXCLUDED.budget_amount,
    actual_amount = EXCLUDED.actual_amount;
$$;


-- Recompute transaction summaries (alternate version with UPSERT)
CREATE OR REPLACE FUNCTION public.recompute_transaction_summaries_for_year(p_year INTEGER)
RETURNS VOID
LANGUAGE sql
AS $$
  -- Vendors summary
  INSERT INTO public.transaction_year_vendor AS t (
    fiscal_year,
    vendor,
    total_amount,
    txn_count,
    first_txn_date,
    last_txn_date
  )
  SELECT
    fiscal_year,
    COALESCE(NULLIF(TRIM(vendor), ''), 'Unspecified') AS vendor,
    SUM(amount) AS total_amount,
    COUNT(*) AS txn_count,
    MIN(date) AS first_txn_date,
    MAX(date) AS last_txn_date
  FROM public.transactions
  WHERE fiscal_year = p_year
  GROUP BY fiscal_year, COALESCE(NULLIF(TRIM(vendor), ''), 'Unspecified')
  ON CONFLICT (fiscal_year, vendor) DO UPDATE
  SET
    total_amount   = EXCLUDED.total_amount,
    txn_count      = EXCLUDED.txn_count,
    first_txn_date = EXCLUDED.first_txn_date,
    last_txn_date  = EXCLUDED.last_txn_date;

  -- Department summary
  INSERT INTO public.transaction_year_department AS d (
    fiscal_year,
    department_name,
    total_amount,
    txn_count
  )
  SELECT
    fiscal_year,
    COALESCE(NULLIF(TRIM(department_name), ''), 'Unspecified') AS department_name,
    SUM(amount) AS total_amount,
    COUNT(*) AS txn_count
  FROM public.transactions
  WHERE fiscal_year = p_year
  GROUP BY fiscal_year, COALESCE(NULLIF(TRIM(department_name), ''), 'Unspecified')
  ON CONFLICT (fiscal_year, department_name) DO UPDATE
  SET
    total_amount = EXCLUDED.total_amount,
    txn_count    = EXCLUDED.txn_count;
$$;


-- Audit log trigger function for publish/unpublish
CREATE OR REPLACE FUNCTION public.audit_log_publish_toggle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor_id UUID;
  actor_email TEXT;
BEGIN
  actor_id := auth.uid();
  actor_email := COALESCE(auth.jwt() ->> 'email', NULL);

  IF (OLD.is_published IS DISTINCT FROM NEW.is_published) THEN
    INSERT INTO public.admin_audit_log (
      actor_user_id,
      actor_email,
      action,
      target_table,
      status,
      meta
    )
    VALUES (
      actor_id,
      actor_email,
      CASE WHEN NEW.is_published THEN 'PUBLISH' ELSE 'UNPUBLISH' END,
      'portal_settings',
      'SUCCESS',
      jsonb_build_object(
        'old_is_published', OLD.is_published,
        'new_is_published', NEW.is_published
      )
    );
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================================
-- 12. TRIGGERS
-- ============================================================================

-- Log when portal is published/unpublished
CREATE TRIGGER trg_audit_log_publish_toggle
  AFTER UPDATE ON public.portal_settings
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_publish_toggle();


-- ============================================================================
-- 13. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- PROFILES
CREATE POLICY "Profiles are readable by owner"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- PORTAL SETTINGS
CREATE POLICY "Public read portal_settings when published"
  ON public.portal_settings FOR SELECT
  USING (is_portal_published());

CREATE POLICY "portal_settings_admins_rw"
  ON public.portal_settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin', 'super_admin'])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = ANY (ARRAY['admin', 'super_admin'])
  ));

-- BUDGETS
CREATE POLICY "Public read budgets when published"
  ON public.budgets FOR SELECT
  USING (is_portal_published());

-- ACTUALS
CREATE POLICY "Public read actuals when published"
  ON public.actuals FOR SELECT
  USING (is_portal_published());

-- TRANSACTIONS
CREATE POLICY "Public read transactions when published"
  ON public.transactions FOR SELECT
  USING (is_portal_published());

-- REVENUES
CREATE POLICY "Public read revenues when published"
  ON public.revenues FOR SELECT
  USING (is_portal_published());

-- ROLLUP TABLES
CREATE POLICY "Public read budget/actual rollups when published"
  ON public.budget_actuals_year_department FOR SELECT
  USING (is_portal_published());

CREATE POLICY "Public read tx dept rollups when published"
  ON public.transaction_year_department FOR SELECT
  USING (is_portal_published());

CREATE POLICY "Public read vendor rollups when published"
  ON public.transaction_year_vendor FOR SELECT
  USING (is_portal_published());

-- DATA UPLOADS
CREATE POLICY "Admins can view upload history"
  ON public.data_uploads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = ANY (ARRAY['admin', 'super_admin'])
  ));

-- ADMIN AUDIT LOG
CREATE POLICY "Admin read audit log"
  ON public.admin_audit_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = ANY (ARRAY['admin', 'super_admin'])
  ));

CREATE POLICY "No client writes audit log"
  ON public.admin_audit_log FOR ALL
  USING (false)
  WITH CHECK (false);


-- ============================================================================
-- 14. INITIAL DATA
-- ============================================================================

-- Create default portal settings row
INSERT INTO public.portal_settings (
  id,
  city_name,
  tagline,
  is_published
) VALUES (
  1,
  'Your City',
  'Transparent Government, Empowered Citizens.',
  false
) ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- 15. STORAGE BUCKETS (Manual Step Required)
-- ============================================================================
-- 
-- You must create storage buckets manually in the Supabase Dashboard:
-- 
-- 1. Go to Storage in the left sidebar
-- 2. Click "New bucket"
-- 3. Create a bucket named: branding
--    - Public: YES
--    - Allowed MIME types: image/png, image/jpeg, image/svg+xml, image/webp
--    - Max file size: 10MB
-- 
-- This bucket stores logos, hero images, seals, and leader photos.
--
-- ============================================================================


-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
--
-- Next steps:
-- 1. Create the "branding" storage bucket (see above)
-- 2. Create a user in Authentication → Users
-- 3. Add that user to profiles table: 
--    INSERT INTO profiles (id, role) VALUES ('user-uuid-here', 'super_admin');
-- 4. Deploy the application and set environment variables
-- 5. Log in and configure branding
-- 6. Upload financial data
-- 7. Toggle "Published" when ready
--
-- ============================================================================
