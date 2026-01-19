-- ============================================================================
-- MIGRATION 004: Add missing totals views
-- ============================================================================
-- These views aggregate rollup tables to provide year-level totals.
-- Code references these but they were missing from schema.
-- ============================================================================

-- Budget + Actuals totals by year (aggregates budget_actuals_year_department)
CREATE OR REPLACE VIEW public.budget_actuals_year_totals AS
SELECT
  fiscal_year,
  SUM(budget_amount) AS budget_total,
  SUM(actual_amount) AS actual_total
FROM public.budget_actuals_year_department
GROUP BY fiscal_year;

-- Grant access (views inherit RLS from underlying tables)
GRANT SELECT ON public.budget_actuals_year_totals TO anon;
GRANT SELECT ON public.budget_actuals_year_totals TO authenticated;


-- Transaction totals by year (aggregates transaction_year_department)
CREATE OR REPLACE VIEW public.transaction_year_totals AS
SELECT
  fiscal_year,
  SUM(total_amount) AS total_amount,
  SUM(txn_count) AS txn_count
FROM public.transaction_year_department
GROUP BY fiscal_year;

-- Grant access
GRANT SELECT ON public.transaction_year_totals TO anon;
GRANT SELECT ON public.transaction_year_totals TO authenticated;


-- Revenue totals by year (aggregates revenues table directly)
CREATE OR REPLACE VIEW public.revenue_year_totals AS
SELECT
  fiscal_year,
  SUM(amount) AS total_revenue,
  COUNT(*) AS record_count
FROM public.revenues
GROUP BY fiscal_year;

-- Grant access
GRANT SELECT ON public.revenue_year_totals TO anon;
GRANT SELECT ON public.revenue_year_totals TO authenticated;


-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to confirm views exist:
--
-- SELECT * FROM budget_actuals_year_totals LIMIT 5;
-- SELECT * FROM transaction_year_totals LIMIT 5;
-- SELECT * FROM revenue_year_totals LIMIT 5;
-- ============================================================================
