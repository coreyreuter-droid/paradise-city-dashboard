-- ============================================================================
-- Clear All Data for Testing (Fixed Version)
-- Run this in Supabase SQL Editor to reset to a clean state
-- ============================================================================

-- ============================================================================
-- 1. Clear fact tables
-- ============================================================================
TRUNCATE TABLE public.budgets CASCADE;
TRUNCATE TABLE public.actuals CASCADE;
TRUNCATE TABLE public.transactions CASCADE;
TRUNCATE TABLE public.revenues CASCADE;

-- ============================================================================
-- 2. Clear rollup tables
-- ============================================================================
TRUNCATE TABLE public.budget_actuals_year_fund_department CASCADE;
TRUNCATE TABLE public.budget_actuals_year_fund CASCADE;
TRUNCATE TABLE public.transaction_year_fund_department CASCADE;
TRUNCATE TABLE public.transaction_year_fund CASCADE;
TRUNCATE TABLE public.transaction_year_vendor CASCADE;

-- ============================================================================
-- 3. Clear lookup tables (by-year first due to FK, then main)
-- ============================================================================
DELETE FROM public.funds_dim_by_year;
DELETE FROM public.departments_dim_by_year;
DELETE FROM public.funds_dim;
DELETE FROM public.departments_dim;

-- ============================================================================
-- 4. Clear lookup audit log
-- ============================================================================
TRUNCATE TABLE public.lookup_audit_log CASCADE;

-- ============================================================================
-- 5. Clear ingestion system
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ingestion_row_errors') THEN
    TRUNCATE TABLE public.ingestion_row_errors CASCADE;
  END IF;
END $$;

TRUNCATE TABLE public.ingestion_jobs CASCADE;
TRUNCATE TABLE public.raw_files CASCADE;

-- ============================================================================
-- 6. Clear audit/history tables
-- ============================================================================
TRUNCATE TABLE public.data_uploads CASCADE;
TRUNCATE TABLE public.admin_audit_log CASCADE;

-- ============================================================================
-- 7. Clear rate limits (optional)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rate_limits') THEN
    TRUNCATE TABLE public.rate_limits CASCADE;
  END IF;
END $$;

-- ============================================================================
-- 8. Clear user mapping profiles (keep system defaults)
-- ============================================================================
DELETE FROM public.mapping_profiles WHERE is_system = FALSE;

-- ============================================================================
-- Verify everything is empty
-- ============================================================================
SELECT 'budgets' as tbl, COUNT(*) as cnt FROM public.budgets
UNION ALL SELECT 'actuals', COUNT(*) FROM public.actuals
UNION ALL SELECT 'transactions', COUNT(*) FROM public.transactions
UNION ALL SELECT 'revenues', COUNT(*) FROM public.revenues
UNION ALL SELECT 'funds_dim', COUNT(*) FROM public.funds_dim
UNION ALL SELECT 'departments_dim', COUNT(*) FROM public.departments_dim
UNION ALL SELECT 'funds_dim_by_year', COUNT(*) FROM public.funds_dim_by_year
UNION ALL SELECT 'departments_dim_by_year', COUNT(*) FROM public.departments_dim_by_year
UNION ALL SELECT 'ingestion_jobs', COUNT(*) FROM public.ingestion_jobs
ORDER BY tbl;
