-- ============================================================================
-- Migration 010: Versioned Lookup Tables
-- ============================================================================
-- This migration replaces the flat lookup tables with versioned ones that
-- support fiscal year ranges. This allows customers to switch accounting
-- systems without breaking historical data display.
-- ============================================================================

-- Prerequisites
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- STEP 1: Drop existing lookup tables and related objects
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Public read funds_dim" ON public.funds_dim;
DROP POLICY IF EXISTS "Public read departments_dim" ON public.departments_dim;
DROP POLICY IF EXISTS "Admin write funds_dim" ON public.funds_dim;
DROP POLICY IF EXISTS "Admin write departments_dim" ON public.departments_dim;

-- Drop existing indexes
DROP INDEX IF EXISTS idx_funds_dim_active;
DROP INDEX IF EXISTS idx_departments_dim_active;

-- Drop existing tables (CASCADE will handle any FK references)
DROP TABLE IF EXISTS public.funds_dim CASCADE;
DROP TABLE IF EXISTS public.departments_dim CASCADE;

-- ============================================================================
-- STEP 2: Create versioned lookup tables
-- ============================================================================

-- FUNDS_DIM (Versioned)
CREATE TABLE public.funds_dim (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_code TEXT NOT NULL,
  fund_name TEXT NOT NULL,
  effective_start_fy INTEGER NOT NULL,
  effective_end_fy INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Sanity check: end >= start when end is specified
  CONSTRAINT funds_dim_valid_range 
    CHECK (effective_end_fy IS NULL OR effective_end_fy >= effective_start_fy)
);

-- Prevent overlapping fiscal year ranges for the same code
-- Uses int4range with '[)' (start inclusive, end exclusive)
-- COALESCE to 9999 handles NULL (ongoing), +1 because '[)' is end-exclusive
ALTER TABLE public.funds_dim
  ADD CONSTRAINT funds_dim_no_overlap
  EXCLUDE USING gist (
    fund_code WITH =,
    int4range(effective_start_fy, COALESCE(effective_end_fy, 9999) + 1, '[)') WITH &&
  );

-- Prevent multiple "current" (ongoing) entries for the same code
CREATE UNIQUE INDEX funds_dim_one_current
  ON public.funds_dim (fund_code)
  WHERE effective_end_fy IS NULL;

-- Performance index for lookups
CREATE INDEX idx_funds_dim_code_years
  ON public.funds_dim (fund_code, effective_start_fy, effective_end_fy);

-- DEPARTMENTS_DIM (Versioned)
CREATE TABLE public.departments_dim (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_code TEXT NOT NULL,
  department_name TEXT NOT NULL,
  effective_start_fy INTEGER NOT NULL,
  effective_end_fy INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT departments_dim_valid_range 
    CHECK (effective_end_fy IS NULL OR effective_end_fy >= effective_start_fy)
);

ALTER TABLE public.departments_dim
  ADD CONSTRAINT departments_dim_no_overlap
  EXCLUDE USING gist (
    department_code WITH =,
    int4range(effective_start_fy, COALESCE(effective_end_fy, 9999) + 1, '[)') WITH &&
  );

CREATE UNIQUE INDEX departments_dim_one_current
  ON public.departments_dim (department_code)
  WHERE effective_end_fy IS NULL;

CREATE INDEX idx_departments_dim_code_years
  ON public.departments_dim (department_code, effective_start_fy, effective_end_fy);

-- ============================================================================
-- STEP 3: Create resolved by-year tables
-- ============================================================================
-- These tables provide pre-resolved lookups for simple equality joins.
-- They are refreshed whenever the versioned tables change.

CREATE TABLE public.funds_dim_by_year (
  fiscal_year INTEGER NOT NULL,
  fund_code TEXT NOT NULL,
  fund_name TEXT NOT NULL,
  fund_dim_id UUID REFERENCES public.funds_dim(id) ON DELETE CASCADE,
  
  PRIMARY KEY (fiscal_year, fund_code)
);

CREATE INDEX idx_funds_by_year_code 
  ON public.funds_dim_by_year (fund_code, fiscal_year);

CREATE TABLE public.departments_dim_by_year (
  fiscal_year INTEGER NOT NULL,
  department_code TEXT NOT NULL,
  department_name TEXT NOT NULL,
  department_dim_id UUID REFERENCES public.departments_dim(id) ON DELETE CASCADE,
  
  PRIMARY KEY (fiscal_year, department_code)
);

CREATE INDEX idx_departments_by_year_code 
  ON public.departments_dim_by_year (department_code, fiscal_year);

-- ============================================================================
-- STEP 4: Create audit log table
-- ============================================================================

CREATE TABLE public.lookup_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lookup_type TEXT NOT NULL CHECK (lookup_type IN ('funds', 'departments')),
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'close', 'delete', 'bulk_replace', 'bulk_additional')),
  lookup_code TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  affected_fy_start INTEGER,
  affected_fy_end INTEGER,
  actor_user_id UUID,
  actor_email TEXT,
  upload_batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lookup_audit_type_code 
  ON public.lookup_audit_log (lookup_type, lookup_code);
CREATE INDEX idx_lookup_audit_batch 
  ON public.lookup_audit_log (upload_batch_id);
CREATE INDEX idx_lookup_audit_actor 
  ON public.lookup_audit_log (actor_user_id);
CREATE INDEX idx_lookup_audit_created 
  ON public.lookup_audit_log (created_at DESC);

-- ============================================================================
-- STEP 5: Create helper function to get all fiscal years with data
-- ============================================================================

CREATE OR REPLACE FUNCTION get_all_fiscal_years()
RETURNS TABLE(fiscal_year INTEGER) AS $$
  SELECT DISTINCT fiscal_year FROM public.budgets
  UNION
  SELECT DISTINCT fiscal_year FROM public.actuals
  UNION
  SELECT DISTINCT fiscal_year FROM public.transactions
  UNION
  SELECT DISTINCT fiscal_year FROM public.revenues
  ORDER BY fiscal_year;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- STEP 6: Create refresh functions for by-year tables
-- ============================================================================

-- Refresh funds_dim_by_year for a range of fiscal years (or all if no range)
CREATE OR REPLACE FUNCTION refresh_funds_by_year(
  p_start_fy INTEGER DEFAULT NULL,
  p_end_fy INTEGER DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_min_fy INTEGER;
  v_max_fy INTEGER;
BEGIN
  -- Determine range to refresh
  IF p_start_fy IS NULL THEN
    SELECT MIN(fiscal_year), MAX(fiscal_year) 
    INTO v_min_fy, v_max_fy 
    FROM get_all_fiscal_years();
  ELSE
    v_min_fy := p_start_fy;
    v_max_fy := COALESCE(p_end_fy, p_start_fy);
  END IF;
  
  -- Exit if no data
  IF v_min_fy IS NULL THEN
    RETURN;
  END IF;
  
  -- Delete existing rows in range
  DELETE FROM public.funds_dim_by_year
  WHERE fiscal_year >= v_min_fy AND fiscal_year <= v_max_fy;
  
  -- Insert resolved mappings
  INSERT INTO public.funds_dim_by_year (fiscal_year, fund_code, fund_name, fund_dim_id)
  SELECT DISTINCT ON (fy.fiscal_year, fd.fund_code)
    fy.fiscal_year,
    fd.fund_code,
    fd.fund_name,
    fd.id
  FROM (SELECT fiscal_year FROM get_all_fiscal_years() 
        WHERE fiscal_year >= v_min_fy AND fiscal_year <= v_max_fy) fy
  CROSS JOIN public.funds_dim fd
  WHERE fy.fiscal_year >= fd.effective_start_fy
    AND (fd.effective_end_fy IS NULL OR fy.fiscal_year <= fd.effective_end_fy)
  ORDER BY fy.fiscal_year, fd.fund_code, fd.effective_start_fy DESC;
END;
$$ LANGUAGE plpgsql;

-- Refresh departments_dim_by_year for a range of fiscal years
CREATE OR REPLACE FUNCTION refresh_departments_by_year(
  p_start_fy INTEGER DEFAULT NULL,
  p_end_fy INTEGER DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_min_fy INTEGER;
  v_max_fy INTEGER;
BEGIN
  -- Determine range to refresh
  IF p_start_fy IS NULL THEN
    SELECT MIN(fiscal_year), MAX(fiscal_year) 
    INTO v_min_fy, v_max_fy 
    FROM get_all_fiscal_years();
  ELSE
    v_min_fy := p_start_fy;
    v_max_fy := COALESCE(p_end_fy, p_start_fy);
  END IF;
  
  -- Exit if no data
  IF v_min_fy IS NULL THEN
    RETURN;
  END IF;
  
  -- Delete existing rows in range
  DELETE FROM public.departments_dim_by_year
  WHERE fiscal_year >= v_min_fy AND fiscal_year <= v_max_fy;
  
  -- Insert resolved mappings
  INSERT INTO public.departments_dim_by_year (fiscal_year, department_code, department_name, department_dim_id)
  SELECT DISTINCT ON (fy.fiscal_year, dd.department_code)
    fy.fiscal_year,
    dd.department_code,
    dd.department_name,
    dd.id
  FROM (SELECT fiscal_year FROM get_all_fiscal_years() 
        WHERE fiscal_year >= v_min_fy AND fiscal_year <= v_max_fy) fy
  CROSS JOIN public.departments_dim dd
  WHERE fy.fiscal_year >= dd.effective_start_fy
    AND (dd.effective_end_fy IS NULL OR fy.fiscal_year <= dd.effective_end_fy)
  ORDER BY fy.fiscal_year, dd.department_code, dd.effective_start_fy DESC;
END;
$$ LANGUAGE plpgsql;

-- Convenience function to refresh all lookups
CREATE OR REPLACE FUNCTION refresh_all_lookups_by_year()
RETURNS void AS $$
BEGIN
  PERFORM refresh_funds_by_year();
  PERFORM refresh_departments_by_year();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 7: Setup RLS policies
-- ============================================================================

-- funds_dim
ALTER TABLE public.funds_dim ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read funds_dim" ON public.funds_dim
  FOR SELECT USING (true);

CREATE POLICY "Admins manage funds_dim" ON public.funds_dim
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- departments_dim
ALTER TABLE public.departments_dim ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read departments_dim" ON public.departments_dim
  FOR SELECT USING (true);

CREATE POLICY "Admins manage departments_dim" ON public.departments_dim
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- by-year tables (read-only, populated by functions)
ALTER TABLE public.funds_dim_by_year ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read funds_dim_by_year" ON public.funds_dim_by_year
  FOR SELECT USING (true);

-- Service role needs to manage by-year tables via functions
CREATE POLICY "Service manage funds_dim_by_year" ON public.funds_dim_by_year
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.departments_dim_by_year ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read departments_dim_by_year" ON public.departments_dim_by_year
  FOR SELECT USING (true);

CREATE POLICY "Service manage departments_dim_by_year" ON public.departments_dim_by_year
  FOR ALL USING (true) WITH CHECK (true);

-- audit log (admins read only)
ALTER TABLE public.lookup_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit log" ON public.lookup_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Service write audit log" ON public.lookup_audit_log
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- STEP 8: Update rollup views to use by-year tables
-- ============================================================================

-- Drop and recreate views that join lookup tables
DROP VIEW IF EXISTS public.v_budget_actuals_year_fund_department CASCADE;
DROP VIEW IF EXISTS public.v_transactions_with_lookups CASCADE;
DROP VIEW IF EXISTS public.v_revenues_with_lookups CASCADE;

-- Budget/Actuals view with versioned lookups
CREATE OR REPLACE VIEW public.v_budget_actuals_year_fund_department AS
SELECT 
  COALESCE(b.fiscal_year, a.fiscal_year) AS fiscal_year,
  COALESCE(b.fund_code, a.fund_code) AS fund_code,
  COALESCE(f.fund_name, b.fund_name, a.fund_name) AS fund_name,
  COALESCE(b.department_code, a.department_code) AS department_code,
  COALESCE(d.department_name, b.department_name, a.department_name) AS department_name,
  COALESCE(b.budget_total, 0) AS budget_amount,
  COALESCE(a.actual_total, 0) AS actual_amount
FROM (
  SELECT fiscal_year, fund_code, fund_name, department_code, department_name, 
         SUM(amount) AS budget_total
  FROM public.budgets
  GROUP BY fiscal_year, fund_code, fund_name, department_code, department_name
) b
FULL OUTER JOIN (
  SELECT fiscal_year, fund_code, fund_name, department_code, department_name,
         SUM(amount) AS actual_total
  FROM public.actuals
  GROUP BY fiscal_year, fund_code, fund_name, department_code, department_name
) a ON b.fiscal_year = a.fiscal_year 
   AND b.fund_code = a.fund_code 
   AND b.department_code = a.department_code
LEFT JOIN public.funds_dim_by_year f 
  ON COALESCE(b.fund_code, a.fund_code) = f.fund_code
  AND COALESCE(b.fiscal_year, a.fiscal_year) = f.fiscal_year
LEFT JOIN public.departments_dim_by_year d 
  ON COALESCE(b.department_code, a.department_code) = d.department_code
  AND COALESCE(b.fiscal_year, a.fiscal_year) = d.fiscal_year;

-- ============================================================================
-- DONE
-- ============================================================================
-- After running this migration:
-- 1. Upload lookup CSVs via the admin UI (will populate versioned tables)
-- 2. Import financial data (budgets, actuals, transactions, revenues)
-- 3. Lookups will automatically refresh when data is imported
-- ============================================================================
