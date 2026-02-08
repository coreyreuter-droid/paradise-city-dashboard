-- =============================================================================
-- Migration 014: Auto-Populate Lookups Infrastructure
-- =============================================================================
-- Creates the RPC function needed to refresh by-year lookup tables after
-- auto-populating the dimension tables during data upload.
-- =============================================================================

-- =============================================================================
-- FUNCTION: Refresh by-year lookup tables
-- =============================================================================
-- Called after inserting new entries into departments_dim or funds_dim
-- to update the by-year tables that views use for name resolution.

CREATE OR REPLACE FUNCTION public.refresh_lookup_by_year_tables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  min_year INTEGER := 2015;  -- Reasonable minimum
  max_year INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER + 10;  -- 10 years ahead
BEGIN
  -- Refresh departments_dim_by_year
  DELETE FROM departments_dim_by_year;
  
  INSERT INTO departments_dim_by_year (fiscal_year, department_code, department_name, department_dim_id)
  SELECT 
    fy.year,
    d.department_code,
    d.department_name,
    d.id
  FROM departments_dim d
  CROSS JOIN generate_series(min_year, max_year) AS fy(year)
  WHERE d.effective_start_fy <= fy.year
    AND (d.effective_end_fy IS NULL OR d.effective_end_fy >= fy.year);

  -- Refresh funds_dim_by_year
  DELETE FROM funds_dim_by_year;
  
  INSERT INTO funds_dim_by_year (fiscal_year, fund_code, fund_name, fund_dim_id)
  SELECT 
    fy.year,
    f.fund_code,
    f.fund_name,
    f.id
  FROM funds_dim f
  CROSS JOIN generate_series(min_year, max_year) AS fy(year)
  WHERE f.effective_start_fy <= fy.year
    AND (f.effective_end_fy IS NULL OR f.effective_end_fy >= fy.year);

  RAISE NOTICE 'Refreshed lookup by-year tables (% to %)', min_year, max_year;
END;
$$;

-- Grant execute to authenticated users (needed for upload route)
GRANT EXECUTE ON FUNCTION public.refresh_lookup_by_year_tables() TO authenticated;

-- =============================================================================
-- UNIQUE CONSTRAINT FIX
-- =============================================================================
-- The upsert in the upload route needs a unique constraint on just the code
-- (not the full composite key with effective_start_fy).
-- We'll add partial unique indexes for "current" entries.

-- For departments: only one "current" entry per code (where effective_end_fy IS NULL)
-- This index already exists from migration 010, but let's ensure it:
DROP INDEX IF EXISTS departments_dim_one_current;
CREATE UNIQUE INDEX departments_dim_one_current
  ON departments_dim (department_code)
  WHERE effective_end_fy IS NULL;

-- For funds: same pattern
DROP INDEX IF EXISTS funds_dim_one_current;
CREATE UNIQUE INDEX funds_dim_one_current
  ON funds_dim (fund_code)
  WHERE effective_end_fy IS NULL;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
SELECT 'Migration 014 complete - refresh_lookup_by_year_tables() created' AS status;
