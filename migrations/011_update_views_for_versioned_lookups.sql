-- ============================================================================
-- Migration 011: Update Rollup Views for Versioned Lookups
-- ============================================================================
-- This migration updates the rollup views to use the by-year lookup tables
-- instead of the flat lookup tables. This enables proper versioned name
-- resolution - historical data shows old names, new data shows new names.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: Drop and recreate views with by-year joins
-- ============================================================================

-- Budget/Actuals by Fund/Department
DROP VIEW IF EXISTS public.v_budget_actuals_year_fund_department CASCADE;

CREATE OR REPLACE VIEW public.v_budget_actuals_year_fund_department AS
SELECT
  r.fiscal_year,
  r.fund_code,
  NULLIF(r.fund_code, '__UNKNOWN__') AS fund_code_clean,
  CASE
    WHEN r.fund_code = '__UNKNOWN__' THEN 'Unknown'
    ELSE COALESCE(f.fund_name, 'Unknown (' || r.fund_code || ')')
  END AS fund_name,

  r.department_code,
  NULLIF(r.department_code, '__UNKNOWN__') AS department_code_clean,
  CASE
    WHEN r.department_code = '__UNKNOWN__' THEN 'Unknown'
    ELSE COALESCE(d.department_name, 'Unknown (' || r.department_code || ')')
  END AS department_name,

  r.budget_amount,
  r.actual_amount,
  r.updated_at
FROM public.budget_actuals_year_fund_department r
LEFT JOIN public.funds_dim_by_year f
  ON f.fund_code = r.fund_code
  AND f.fiscal_year = r.fiscal_year
LEFT JOIN public.departments_dim_by_year d
  ON d.department_code = r.department_code
  AND d.fiscal_year = r.fiscal_year;

-- Budget/Actuals by Fund
DROP VIEW IF EXISTS public.v_budget_actuals_year_fund CASCADE;

CREATE OR REPLACE VIEW public.v_budget_actuals_year_fund AS
SELECT
  r.fiscal_year,
  r.fund_code,
  NULLIF(r.fund_code, '__UNKNOWN__') AS fund_code_clean,
  CASE
    WHEN r.fund_code = '__UNKNOWN__' THEN 'Unknown'
    ELSE COALESCE(f.fund_name, 'Unknown (' || r.fund_code || ')')
  END AS fund_name,
  r.budget_amount,
  r.actual_amount,
  r.updated_at
FROM public.budget_actuals_year_fund r
LEFT JOIN public.funds_dim_by_year f
  ON f.fund_code = r.fund_code
  AND f.fiscal_year = r.fiscal_year;

-- Transactions by Fund/Department
DROP VIEW IF EXISTS public.v_transaction_year_fund_department CASCADE;

CREATE OR REPLACE VIEW public.v_transaction_year_fund_department AS
SELECT
  r.fiscal_year,
  r.fund_code,
  NULLIF(r.fund_code, '__UNKNOWN__') AS fund_code_clean,
  CASE
    WHEN r.fund_code = '__UNKNOWN__' THEN 'Unknown'
    ELSE COALESCE(f.fund_name, 'Unknown (' || r.fund_code || ')')
  END AS fund_name,

  r.department_code,
  NULLIF(r.department_code, '__UNKNOWN__') AS department_code_clean,
  CASE
    WHEN r.department_code = '__UNKNOWN__' THEN 'Unknown'
    ELSE COALESCE(d.department_name, 'Unknown (' || r.department_code || ')')
  END AS department_name,

  r.total_amount,
  r.txn_count,
  r.updated_at
FROM public.transaction_year_fund_department r
LEFT JOIN public.funds_dim_by_year f
  ON f.fund_code = r.fund_code
  AND f.fiscal_year = r.fiscal_year
LEFT JOIN public.departments_dim_by_year d
  ON d.department_code = r.department_code
  AND d.fiscal_year = r.fiscal_year;

-- Transactions by Fund
DROP VIEW IF EXISTS public.v_transaction_year_fund CASCADE;

CREATE OR REPLACE VIEW public.v_transaction_year_fund AS
SELECT
  r.fiscal_year,
  r.fund_code,
  NULLIF(r.fund_code, '__UNKNOWN__') AS fund_code_clean,
  CASE
    WHEN r.fund_code = '__UNKNOWN__' THEN 'Unknown'
    ELSE COALESCE(f.fund_name, 'Unknown (' || r.fund_code || ')')
  END AS fund_name,
  r.total_amount,
  r.txn_count,
  r.updated_at
FROM public.transaction_year_fund r
LEFT JOIN public.funds_dim_by_year f
  ON f.fund_code = r.fund_code
  AND f.fiscal_year = r.fiscal_year;

-- Transactions by Vendor (no lookup changes needed, kept for consistency)
DROP VIEW IF EXISTS public.v_transaction_year_vendor CASCADE;

CREATE OR REPLACE VIEW public.v_transaction_year_vendor AS
SELECT
  r.fiscal_year,
  r.vendor,
  NULLIF(r.vendor, '__UNKNOWN__') AS vendor_clean,
  CASE
    WHEN r.vendor = '__UNKNOWN__' THEN 'Unknown'
    ELSE r.vendor
  END AS vendor_display,
  r.total_amount,
  r.txn_count,
  r.first_txn_date,
  r.last_txn_date,
  r.updated_at
FROM public.transaction_year_vendor r;

-- ============================================================================
-- SECTION 2: Recreate year totals views (depend on above views)
-- ============================================================================

DROP VIEW IF EXISTS public.budget_actuals_year_totals CASCADE;

CREATE OR REPLACE VIEW public.budget_actuals_year_totals AS
SELECT
  fiscal_year,
  SUM(budget_amount)::numeric AS budget_amount,
  SUM(actual_amount)::numeric AS actual_amount,
  MAX(updated_at) AS updated_at
FROM public.budget_actuals_year_fund
GROUP BY fiscal_year;

DROP VIEW IF EXISTS public.transaction_year_totals CASCADE;

CREATE OR REPLACE VIEW public.transaction_year_totals AS
SELECT
  fiscal_year,
  SUM(total_amount)::numeric AS total_amount,
  SUM(txn_count)::bigint     AS txn_count,
  MAX(updated_at) AS updated_at
FROM public.transaction_year_fund
GROUP BY fiscal_year;

-- ============================================================================
-- SECTION 3: Grants
-- ============================================================================

GRANT SELECT ON public.v_budget_actuals_year_fund_department TO anon, authenticated;
GRANT SELECT ON public.v_budget_actuals_year_fund TO anon, authenticated;
GRANT SELECT ON public.v_transaction_year_fund_department TO anon, authenticated;
GRANT SELECT ON public.v_transaction_year_fund TO anon, authenticated;
GRANT SELECT ON public.v_transaction_year_vendor TO anon, authenticated;
GRANT SELECT ON public.budget_actuals_year_totals TO anon, authenticated;
GRANT SELECT ON public.transaction_year_totals TO anon, authenticated;

COMMIT;

-- ============================================================================
-- DONE
-- ============================================================================
SELECT 'Rollup views updated for versioned lookups!' AS status;
