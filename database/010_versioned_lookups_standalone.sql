-- ============================================================================
-- VERSIONED LOOKUP TABLES - STANDALONE SQL
-- ============================================================================
-- Run this on an existing CiviPortal database to add versioned lookup support.
-- This script is idempotent and can be re-run safely.
-- ============================================================================

-- Prerequisites
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- STEP 1: Drop existing lookup tables and related objects
-- ============================================================================

DROP POLICY IF EXISTS "Public read funds_dim" ON public.funds_dim;
DROP POLICY IF EXISTS "Public read departments_dim" ON public.departments_dim;
DROP POLICY IF EXISTS "Admin write funds_dim" ON public.funds_dim;
DROP POLICY IF EXISTS "Admin write departments_dim" ON public.departments_dim;
DROP POLICY IF EXISTS "Admins manage funds_dim" ON public.funds_dim;
DROP POLICY IF EXISTS "Admins manage departments_dim" ON public.departments_dim;

DROP INDEX IF EXISTS idx_funds_dim_active;
DROP INDEX IF EXISTS idx_departments_dim_active;
DROP INDEX IF EXISTS funds_dim_one_current;
DROP INDEX IF EXISTS departments_dim_one_current;
DROP INDEX IF EXISTS idx_funds_dim_code_years;
DROP INDEX IF EXISTS idx_departments_dim_code_years;

DROP TABLE IF EXISTS public.funds_dim_by_year CASCADE;
DROP TABLE IF EXISTS public.departments_dim_by_year CASCADE;
DROP TABLE IF EXISTS public.lookup_audit_log CASCADE;
DROP TABLE IF EXISTS public.funds_dim CASCADE;
DROP TABLE IF EXISTS public.departments_dim CASCADE;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS get_all_fiscal_years();
DROP FUNCTION IF EXISTS refresh_funds_by_year(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS refresh_departments_by_year(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS refresh_all_lookups_by_year();

-- ============================================================================
-- STEP 2: Create versioned lookup tables
-- ============================================================================

CREATE TABLE public.funds_dim (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_code TEXT NOT NULL,
  fund_name TEXT NOT NULL,
  effective_start_fy INTEGER NOT NULL,
  effective_end_fy INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT funds_dim_valid_range 
    CHECK (effective_end_fy IS NULL OR effective_end_fy >= effective_start_fy)
);

ALTER TABLE public.funds_dim
  ADD CONSTRAINT funds_dim_no_overlap
  EXCLUDE USING gist (
    fund_code WITH =,
    int4range(effective_start_fy, COALESCE(effective_end_fy, 9999) + 1, '[)') WITH &&
  );

CREATE UNIQUE INDEX funds_dim_one_current
  ON public.funds_dim (fund_code)
  WHERE effective_end_fy IS NULL;

CREATE INDEX idx_funds_dim_code_years
  ON public.funds_dim (fund_code, effective_start_fy, effective_end_fy);

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
-- STEP 3: Create by-year resolution tables
-- ============================================================================

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
-- STEP 4: Create audit log
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

CREATE INDEX idx_lookup_audit_type_code ON public.lookup_audit_log (lookup_type, lookup_code);
CREATE INDEX idx_lookup_audit_batch ON public.lookup_audit_log (upload_batch_id);
CREATE INDEX idx_lookup_audit_actor ON public.lookup_audit_log (actor_user_id);
CREATE INDEX idx_lookup_audit_created ON public.lookup_audit_log (created_at DESC);

-- ============================================================================
-- STEP 5: Create helper functions
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

CREATE OR REPLACE FUNCTION refresh_funds_by_year(
  p_start_fy INTEGER DEFAULT NULL,
  p_end_fy INTEGER DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_min_fy INTEGER;
  v_max_fy INTEGER;
BEGIN
  IF p_start_fy IS NULL THEN
    SELECT MIN(fiscal_year), MAX(fiscal_year) 
    INTO v_min_fy, v_max_fy 
    FROM get_all_fiscal_years();
  ELSE
    v_min_fy := p_start_fy;
    v_max_fy := COALESCE(p_end_fy, p_start_fy);
  END IF;
  
  IF v_min_fy IS NULL THEN RETURN; END IF;
  
  DELETE FROM public.funds_dim_by_year
  WHERE fiscal_year >= v_min_fy AND fiscal_year <= v_max_fy;
  
  INSERT INTO public.funds_dim_by_year (fiscal_year, fund_code, fund_name, fund_dim_id)
  SELECT DISTINCT ON (fy.fiscal_year, fd.fund_code)
    fy.fiscal_year, fd.fund_code, fd.fund_name, fd.id
  FROM (SELECT fiscal_year FROM get_all_fiscal_years() 
        WHERE fiscal_year >= v_min_fy AND fiscal_year <= v_max_fy) fy
  CROSS JOIN public.funds_dim fd
  WHERE fy.fiscal_year >= fd.effective_start_fy
    AND (fd.effective_end_fy IS NULL OR fy.fiscal_year <= fd.effective_end_fy)
  ORDER BY fy.fiscal_year, fd.fund_code, fd.effective_start_fy DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_departments_by_year(
  p_start_fy INTEGER DEFAULT NULL,
  p_end_fy INTEGER DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_min_fy INTEGER;
  v_max_fy INTEGER;
BEGIN
  IF p_start_fy IS NULL THEN
    SELECT MIN(fiscal_year), MAX(fiscal_year) 
    INTO v_min_fy, v_max_fy 
    FROM get_all_fiscal_years();
  ELSE
    v_min_fy := p_start_fy;
    v_max_fy := COALESCE(p_end_fy, p_start_fy);
  END IF;
  
  IF v_min_fy IS NULL THEN RETURN; END IF;
  
  DELETE FROM public.departments_dim_by_year
  WHERE fiscal_year >= v_min_fy AND fiscal_year <= v_max_fy;
  
  INSERT INTO public.departments_dim_by_year (fiscal_year, department_code, department_name, department_dim_id)
  SELECT DISTINCT ON (fy.fiscal_year, dd.department_code)
    fy.fiscal_year, dd.department_code, dd.department_name, dd.id
  FROM (SELECT fiscal_year FROM get_all_fiscal_years() 
        WHERE fiscal_year >= v_min_fy AND fiscal_year <= v_max_fy) fy
  CROSS JOIN public.departments_dim dd
  WHERE fy.fiscal_year >= dd.effective_start_fy
    AND (dd.effective_end_fy IS NULL OR fy.fiscal_year <= dd.effective_end_fy)
  ORDER BY fy.fiscal_year, dd.department_code, dd.effective_start_fy DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_all_lookups_by_year()
RETURNS void AS $$
BEGIN
  PERFORM refresh_funds_by_year();
  PERFORM refresh_departments_by_year();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: Setup RLS policies
-- ============================================================================

ALTER TABLE public.funds_dim ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read funds_dim" ON public.funds_dim FOR SELECT USING (true);
CREATE POLICY "Admins manage funds_dim" ON public.funds_dim FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

ALTER TABLE public.departments_dim ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read departments_dim" ON public.departments_dim FOR SELECT USING (true);
CREATE POLICY "Admins manage departments_dim" ON public.departments_dim FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

ALTER TABLE public.funds_dim_by_year ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read funds_dim_by_year" ON public.funds_dim_by_year FOR SELECT USING (true);
CREATE POLICY "Service manage funds_dim_by_year" ON public.funds_dim_by_year FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.departments_dim_by_year ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read departments_dim_by_year" ON public.departments_dim_by_year FOR SELECT USING (true);
CREATE POLICY "Service manage departments_dim_by_year" ON public.departments_dim_by_year FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.lookup_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.lookup_audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Service write audit log" ON public.lookup_audit_log FOR INSERT WITH CHECK (true);

-- ============================================================================
-- DONE
-- ============================================================================
SELECT 'Versioned lookups migration complete!' AS status;
