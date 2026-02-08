-- =============================================================================
-- Migration 015: Department-Level Aggregated Views
-- =============================================================================
-- Creates views that aggregate budget/actuals and transactions BY DEPARTMENT,
-- summing across all funds. This prevents duplicate rows when the same 
-- department receives funding from multiple funds.
--
-- Existing views (v_budget_actuals_year_fund_department, v_transaction_year_fund_department)
-- are kept intact for future fund-level drill-down features.
-- =============================================================================

-- =============================================================================
-- VIEW 1: Budget/Actuals by Year + Department (no fund breakdown)
-- =============================================================================
DROP VIEW IF EXISTS public.v_budget_actuals_year_department CASCADE;

CREATE VIEW public.v_budget_actuals_year_department AS
SELECT
  fiscal_year,
  department_code,
  department_name,
  SUM(budget_amount) AS budget_amount,
  SUM(actual_amount) AS actual_amount,
  MAX(updated_at) AS updated_at
FROM public.v_budget_actuals_year_fund_department
GROUP BY fiscal_year, department_code, department_name;

-- Grant access
GRANT SELECT ON public.v_budget_actuals_year_department TO anon, authenticated;

-- =============================================================================
-- VIEW 2: Transactions by Year + Department (no fund breakdown)
-- =============================================================================
DROP VIEW IF EXISTS public.v_transaction_year_department CASCADE;

CREATE VIEW public.v_transaction_year_department AS
SELECT
  fiscal_year,
  department_code,
  department_name,
  SUM(total_amount) AS total_amount,
  SUM(txn_count) AS txn_count,
  MAX(updated_at) AS updated_at
FROM public.v_transaction_year_fund_department
GROUP BY fiscal_year, department_code, department_name;

-- Grant access
GRANT SELECT ON public.v_transaction_year_department TO anon, authenticated;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
SELECT 'Migration 015 complete - department-level aggregated views created' AS status;

-- Show row counts to verify aggregation is working
SELECT 'v_budget_actuals_year_fund_department' AS view_name, COUNT(*) AS rows FROM v_budget_actuals_year_fund_department
UNION ALL
SELECT 'v_budget_actuals_year_department', COUNT(*) FROM v_budget_actuals_year_department
UNION ALL
SELECT 'v_transaction_year_fund_department', COUNT(*) FROM v_transaction_year_fund_department
UNION ALL
SELECT 'v_transaction_year_department', COUNT(*) FROM v_transaction_year_department;
