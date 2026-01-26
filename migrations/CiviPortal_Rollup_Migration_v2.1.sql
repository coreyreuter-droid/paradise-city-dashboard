-- ============================================================================
-- CiviPortal Rollup Migration (DEV) — Codes-as-Truth + Name Resolution via Views
-- Version: 2.1 (Fixed wrapper function names to match app code)
-- Date: 2026-01-25
--
-- Includes everything from v1 PLUS:
--  - Preflight check: funds_dim and departments_dim exist
--  - Missing indexes on fund_code/department_code/vendor
--  - Year totals views: budget_actuals_year_totals, transaction_year_totals
--  - Wrapper functions: recompute_*_summaries_for_year(p_year) calling refresh_*
--  - GRANT EXECUTE to service_role on all functions
--
-- v2.1 FIX: Wrapper function names corrected to match existing app code:
--   - recompute_budget_actuals_summaries_for_year(p_year) [not rollup_for_year(_fy)]
--   - recompute_transaction_summaries_for_year(p_year) [not rollups_for_year(_fy)]
--
-- Locked decisions:
--  - Rollups keyed by compound codes (fiscal_year, fund_code, department_code)
--  - Sentinel for NULL/blank codes: '__UNKNOWN__'
--  - Names resolved in DB views (JOIN to dims) with sentinel hidden
--  - No observed-name fallback for citizens
--  - Account rollups deferred
--  - Compound dim keys deferred (dims globally unique)
--  - Vendor view included for consistency
--  - DEV: drop old rollup tables (no prod data)
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 0: PREFLIGHT CHECKS
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'funds_dim'
  ) THEN
    RAISE EXCEPTION 'Preflight failed: public.funds_dim does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'departments_dim'
  ) THEN
    RAISE EXCEPTION 'Preflight failed: public.departments_dim does not exist';
  END IF;
END $$;

-- ============================================================================
-- SECTION 1: DROP OLD TABLES / VIEWS / FUNCTIONS (DEV)
-- ============================================================================
-- Drop views (v1 + new totals views)
DROP VIEW IF EXISTS public.v_budget_actuals_year_fund_department CASCADE;
DROP VIEW IF EXISTS public.v_budget_actuals_year_fund CASCADE;
DROP VIEW IF EXISTS public.v_transaction_year_fund_department CASCADE;
DROP VIEW IF EXISTS public.v_transaction_year_fund CASCADE;
DROP VIEW IF EXISTS public.v_transaction_year_vendor CASCADE;

DROP VIEW IF EXISTS public.budget_actuals_year_totals CASCADE;
DROP VIEW IF EXISTS public.transaction_year_totals CASCADE;

-- Drop tables (old + v1 rollups)
DROP TABLE IF EXISTS public.budget_actuals_year_department CASCADE;
DROP TABLE IF EXISTS public.budget_actuals_year_fund_department CASCADE;
DROP TABLE IF EXISTS public.budget_actuals_year_fund CASCADE;

DROP TABLE IF EXISTS public.transaction_year_department CASCADE;
DROP TABLE IF EXISTS public.transaction_year_fund_department CASCADE;
DROP TABLE IF EXISTS public.transaction_year_fund CASCADE;
DROP TABLE IF EXISTS public.transaction_year_vendor CASCADE;

-- Drop functions (old + wrappers)
DROP FUNCTION IF EXISTS public.refresh_budget_actuals_year_department_for_year(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.refresh_budget_actuals_rollup_for_year(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.refresh_transaction_rollups_for_year(INTEGER) CASCADE;

-- Drop old wrapper functions (both old names that might exist)
DROP FUNCTION IF EXISTS public.recompute_budget_actuals_rollup_for_year(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.recompute_transaction_rollups_for_year(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.recompute_budget_actuals_summaries_for_year(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.recompute_transaction_summaries_for_year(INTEGER) CASCADE;

-- ============================================================================
-- SECTION 2: CREATE NEW ROLLUP TABLES (5 total)
-- ============================================================================
CREATE TABLE public.budget_actuals_year_fund_department (
  fiscal_year       INTEGER NOT NULL,
  fund_code         TEXT    NOT NULL,
  department_code   TEXT    NOT NULL,
  budget_amount     NUMERIC NOT NULL DEFAULT 0,
  actual_amount     NUMERIC NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (fiscal_year, fund_code, department_code)
);

CREATE TABLE public.budget_actuals_year_fund (
  fiscal_year     INTEGER NOT NULL,
  fund_code       TEXT    NOT NULL,
  budget_amount   NUMERIC NOT NULL DEFAULT 0,
  actual_amount   NUMERIC NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (fiscal_year, fund_code)
);

CREATE TABLE public.transaction_year_fund_department (
  fiscal_year       INTEGER NOT NULL,
  fund_code         TEXT    NOT NULL,
  department_code   TEXT    NOT NULL,
  total_amount      NUMERIC NOT NULL DEFAULT 0,
  txn_count         BIGINT  NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (fiscal_year, fund_code, department_code)
);

CREATE TABLE public.transaction_year_fund (
  fiscal_year     INTEGER NOT NULL,
  fund_code       TEXT    NOT NULL,
  total_amount    NUMERIC NOT NULL DEFAULT 0,
  txn_count       BIGINT  NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (fiscal_year, fund_code)
);

CREATE TABLE public.transaction_year_vendor (
  fiscal_year      INTEGER NOT NULL,
  vendor           TEXT    NOT NULL,
  total_amount     NUMERIC NOT NULL DEFAULT 0,
  txn_count        BIGINT  NOT NULL DEFAULT 0,
  first_txn_date   DATE,
  last_txn_date    DATE,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (fiscal_year, vendor)
);

-- ============================================================================
-- SECTION 2B: INDEXES
-- ============================================================================
-- Fiscal year indexes (handy for per-year page loads)
CREATE INDEX IF NOT EXISTS idx_ba_yfd_fy ON public.budget_actuals_year_fund_department (fiscal_year);
CREATE INDEX IF NOT EXISTS idx_ba_yf_fy  ON public.budget_actuals_year_fund (fiscal_year);

CREATE INDEX IF NOT EXISTS idx_tx_yfd_fy ON public.transaction_year_fund_department (fiscal_year);
CREATE INDEX IF NOT EXISTS idx_tx_yf_fy  ON public.transaction_year_fund (fiscal_year);
CREATE INDEX IF NOT EXISTS idx_tx_yv_fy  ON public.transaction_year_vendor (fiscal_year);

-- Missing indexes requested: common filters / joins
CREATE INDEX IF NOT EXISTS idx_ba_yfd_fund ON public.budget_actuals_year_fund_department (fund_code);
CREATE INDEX IF NOT EXISTS idx_ba_yfd_dept ON public.budget_actuals_year_fund_department (department_code);
CREATE INDEX IF NOT EXISTS idx_ba_yf_fund  ON public.budget_actuals_year_fund (fund_code);

CREATE INDEX IF NOT EXISTS idx_tx_yfd_fund ON public.transaction_year_fund_department (fund_code);
CREATE INDEX IF NOT EXISTS idx_tx_yfd_dept ON public.transaction_year_fund_department (department_code);
CREATE INDEX IF NOT EXISTS idx_tx_yf_fund  ON public.transaction_year_fund (fund_code);

CREATE INDEX IF NOT EXISTS idx_tx_yv_vendor ON public.transaction_year_vendor (vendor);

-- ============================================================================
-- SECTION 3: RLS (PUBLIC READ) FOR ROLLUP TABLES
-- ============================================================================
ALTER TABLE public.budget_actuals_year_fund_department ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_actuals_year_fund ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_year_fund_department ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_year_fund ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_year_vendor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rollups_public_read_ba_yfd ON public.budget_actuals_year_fund_department;
DROP POLICY IF EXISTS rollups_public_read_ba_yf  ON public.budget_actuals_year_fund;
DROP POLICY IF EXISTS rollups_public_read_tx_yfd ON public.transaction_year_fund_department;
DROP POLICY IF EXISTS rollups_public_read_tx_yf  ON public.transaction_year_fund;
DROP POLICY IF EXISTS rollups_public_read_tx_yv  ON public.transaction_year_vendor;

CREATE POLICY rollups_public_read_ba_yfd
  ON public.budget_actuals_year_fund_department
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY rollups_public_read_ba_yf
  ON public.budget_actuals_year_fund
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY rollups_public_read_tx_yfd
  ON public.transaction_year_fund_department
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY rollups_public_read_tx_yf
  ON public.transaction_year_fund
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY rollups_public_read_tx_yv
  ON public.transaction_year_vendor
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- SECTION 4: REFRESH FUNCTIONS (SECURITY DEFINER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refresh_budget_actuals_rollup_for_year(_fy INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.budget_actuals_year_fund_department WHERE fiscal_year = _fy;
  DELETE FROM public.budget_actuals_year_fund WHERE fiscal_year = _fy;

  INSERT INTO public.budget_actuals_year_fund_department (
    fiscal_year, fund_code, department_code, budget_amount, actual_amount, updated_at
  )
  SELECT
    _fy AS fiscal_year,
    COALESCE(b.fund_code, a.fund_code) AS fund_code,
    COALESCE(b.department_code, a.department_code) AS department_code,
    COALESCE(b.budget_amount, 0) AS budget_amount,
    COALESCE(a.actual_amount, 0) AS actual_amount,
    now() AS updated_at
  FROM (
    SELECT
      COALESCE(NULLIF(TRIM(fund_code), ''), '__UNKNOWN__')        AS fund_code,
      COALESCE(NULLIF(TRIM(department_code), ''), '__UNKNOWN__')  AS department_code,
      SUM(COALESCE(amount, 0))::numeric                           AS budget_amount
    FROM public.budgets
    WHERE fiscal_year = _fy
    GROUP BY 1, 2
  ) b
  FULL OUTER JOIN (
    SELECT
      COALESCE(NULLIF(TRIM(fund_code), ''), '__UNKNOWN__')        AS fund_code,
      COALESCE(NULLIF(TRIM(department_code), ''), '__UNKNOWN__')  AS department_code,
      SUM(COALESCE(amount, 0))::numeric                           AS actual_amount
    FROM public.actuals
    WHERE fiscal_year = _fy
    GROUP BY 1, 2
  ) a
    ON a.fund_code = b.fund_code
   AND a.department_code = b.department_code;

  INSERT INTO public.budget_actuals_year_fund (
    fiscal_year, fund_code, budget_amount, actual_amount, updated_at
  )
  SELECT
    fiscal_year,
    fund_code,
    SUM(budget_amount)::numeric AS budget_amount,
    SUM(actual_amount)::numeric AS actual_amount,
    now() AS updated_at
  FROM public.budget_actuals_year_fund_department
  WHERE fiscal_year = _fy
  GROUP BY fiscal_year, fund_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_transaction_rollups_for_year(_fy INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.transaction_year_fund_department WHERE fiscal_year = _fy;
  DELETE FROM public.transaction_year_fund WHERE fiscal_year = _fy;
  DELETE FROM public.transaction_year_vendor WHERE fiscal_year = _fy;

  INSERT INTO public.transaction_year_fund_department (
    fiscal_year, fund_code, department_code, total_amount, txn_count, updated_at
  )
  SELECT
    _fy AS fiscal_year,
    COALESCE(NULLIF(TRIM(fund_code), ''), '__UNKNOWN__')       AS fund_code,
    COALESCE(NULLIF(TRIM(department_code), ''), '__UNKNOWN__') AS department_code,
    SUM(COALESCE(amount, 0))::numeric                          AS total_amount,
    COUNT(*)::bigint                                           AS txn_count,
    now() AS updated_at
  FROM public.transactions
  WHERE fiscal_year = _fy
  GROUP BY 2, 3;

  INSERT INTO public.transaction_year_fund (
    fiscal_year, fund_code, total_amount, txn_count, updated_at
  )
  SELECT
    _fy AS fiscal_year,
    COALESCE(NULLIF(TRIM(fund_code), ''), '__UNKNOWN__') AS fund_code,
    SUM(COALESCE(amount, 0))::numeric                    AS total_amount,
    COUNT(*)::bigint                                     AS txn_count,
    now() AS updated_at
  FROM public.transactions
  WHERE fiscal_year = _fy
  GROUP BY 2;

  INSERT INTO public.transaction_year_vendor (
    fiscal_year, vendor, total_amount, txn_count, first_txn_date, last_txn_date, updated_at
  )
  SELECT
    _fy AS fiscal_year,
    COALESCE(NULLIF(TRIM(vendor), ''), '__UNKNOWN__') AS vendor,
    SUM(COALESCE(amount, 0))::numeric                  AS total_amount,
    COUNT(*)::bigint                                   AS txn_count,
    MIN(date)                                          AS first_txn_date,
    MAX(date)                                          AS last_txn_date,
    now()                                               AS updated_at
  FROM public.transactions
  WHERE fiscal_year = _fy
  GROUP BY 2;
END;
$$;

-- Revoke public execute; worker/service_role should call these.
REVOKE ALL ON FUNCTION public.refresh_budget_actuals_rollup_for_year(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_transaction_rollups_for_year(INTEGER) FROM PUBLIC;

-- ============================================================================
-- SECTION 4B: WRAPPER FUNCTIONS (recompute_* -> refresh_*)
-- These match the EXISTING function names/signatures that app code calls:
--   recompute_budget_actuals_summaries_for_year(p_year)
--   recompute_transaction_summaries_for_year(p_year)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.recompute_budget_actuals_summaries_for_year(p_year INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_budget_actuals_rollup_for_year(p_year);
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_transaction_summaries_for_year(p_year INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_transaction_rollups_for_year(p_year);
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_budget_actuals_summaries_for_year(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recompute_transaction_summaries_for_year(INTEGER) FROM PUBLIC;

-- Grant execute to service_role (used by ingestion worker / server-side jobs)
GRANT EXECUTE ON FUNCTION public.refresh_budget_actuals_rollup_for_year(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_transaction_rollups_for_year(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.recompute_budget_actuals_summaries_for_year(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.recompute_transaction_summaries_for_year(INTEGER) TO service_role;

-- ============================================================================
-- SECTION 5: VIEWS (NAME RESOLUTION + SENTINEL HIDING)
-- ============================================================================
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
LEFT JOIN public.funds_dim f
  ON f.fund_code = r.fund_code
 AND f.is_active = true
LEFT JOIN public.departments_dim d
  ON d.department_code = r.department_code
 AND d.is_active = true;

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
LEFT JOIN public.funds_dim f
  ON f.fund_code = r.fund_code
 AND f.is_active = true;

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
LEFT JOIN public.funds_dim f
  ON f.fund_code = r.fund_code
 AND f.is_active = true
LEFT JOIN public.departments_dim d
  ON d.department_code = r.department_code
 AND d.is_active = true;

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
LEFT JOIN public.funds_dim f
  ON f.fund_code = r.fund_code
 AND f.is_active = true;

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
-- SECTION 6: YEAR TOTALS VIEWS
-- ============================================================================
-- Totals for budget vs actuals per fiscal year
CREATE OR REPLACE VIEW public.budget_actuals_year_totals AS
SELECT
  fiscal_year,
  SUM(budget_amount)::numeric AS budget_amount,
  SUM(actual_amount)::numeric AS actual_amount,
  MAX(updated_at) AS updated_at
FROM public.budget_actuals_year_fund
GROUP BY fiscal_year;

-- Totals for transactions per fiscal year
CREATE OR REPLACE VIEW public.transaction_year_totals AS
SELECT
  fiscal_year,
  SUM(total_amount)::numeric AS total_amount,
  SUM(txn_count)::bigint     AS txn_count,
  MAX(updated_at) AS updated_at
FROM public.transaction_year_fund
GROUP BY fiscal_year;

-- ============================================================================
-- SECTION 7: GRANTS
-- ============================================================================
-- Views and rollup tables are publicly readable via RLS policies. Still, grant
-- SELECT on views (harmless + helps certain tooling).
GRANT SELECT ON public.v_budget_actuals_year_fund_department TO anon, authenticated;
GRANT SELECT ON public.v_budget_actuals_year_fund TO anon, authenticated;
GRANT SELECT ON public.v_transaction_year_fund_department TO anon, authenticated;
GRANT SELECT ON public.v_transaction_year_fund TO anon, authenticated;
GRANT SELECT ON public.v_transaction_year_vendor TO anon, authenticated;
GRANT SELECT ON public.budget_actuals_year_totals TO anon, authenticated;
GRANT SELECT ON public.transaction_year_totals TO anon, authenticated;

COMMIT;
