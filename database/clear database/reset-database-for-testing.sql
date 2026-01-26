-- ============================================================================
-- RESET DATABASE FOR TESTING
-- Clears all financial data while preserving user accounts and settings
-- ============================================================================

-- ============================================================================
-- STEP 1: Clear financial data tables
-- ============================================================================

TRUNCATE TABLE public.budgets CASCADE;
TRUNCATE TABLE public.actuals CASCADE;
TRUNCATE TABLE public.transactions CASCADE;
TRUNCATE TABLE public.revenues CASCADE;

-- ============================================================================
-- STEP 2: Clear rollup/materialized tables (if they exist)
-- ============================================================================

TRUNCATE TABLE public.budget_actuals_year_department CASCADE;
TRUNCATE TABLE public.transaction_year_department CASCADE;
TRUNCATE TABLE public.transaction_year_vendor CASCADE;

-- These may or may not exist depending on v2.1 migration
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_actuals_year_fund') THEN
    TRUNCATE TABLE public.budget_actuals_year_fund CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_actuals_year_fund_department') THEN
    TRUNCATE TABLE public.budget_actuals_year_fund_department CASCADE;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Clear lookup/dimension tables
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'funds_dim') THEN
    TRUNCATE TABLE public.funds_dim CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments_dim') THEN
    TRUNCATE TABLE public.departments_dim CASCADE;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Clear ingestion system tables (if they exist)
-- ============================================================================

DO $$
BEGIN
  -- Clear ingestion jobs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ingestion_jobs') THEN
    TRUNCATE TABLE public.ingestion_jobs CASCADE;
  END IF;
  
  -- Clear ingestion errors
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ingestion_errors') THEN
    TRUNCATE TABLE public.ingestion_errors CASCADE;
  END IF;
  
  -- Clear raw files
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'raw_files') THEN
    TRUNCATE TABLE public.raw_files CASCADE;
  END IF;
  
  -- Clear ingestion profiles (but keep if you want to preserve custom mappings)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ingestion_profiles') THEN
    TRUNCATE TABLE public.ingestion_profiles CASCADE;
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Clear mapping profiles (keep system defaults)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mapping_profiles') THEN
    -- Delete user-created profiles, keep system defaults
    DELETE FROM public.mapping_profiles WHERE is_system = FALSE;
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Clear audit/history tables
-- ============================================================================

TRUNCATE TABLE public.data_uploads CASCADE;
TRUNCATE TABLE public.admin_audit_log CASCADE;

-- ============================================================================
-- STEP 7: Clear rate limits (optional - allows fresh API calls)
-- ============================================================================

TRUNCATE TABLE public.rate_limits CASCADE;

-- ============================================================================
-- WHAT'S PRESERVED:
-- ============================================================================
-- ✓ User accounts (public.profiles)
-- ✓ Portal settings (public.portal_settings)
-- ✓ Auth users (auth.users)
-- ✓ System mapping profiles (Default Template for each dataset type)
-- ✓ Projects (if you have any)
--
-- WHAT'S CLEARED:
-- ✗ All financial data (budgets, actuals, transactions, revenues)
-- ✗ All rollup tables
-- ✗ All lookup tables (funds_dim, departments_dim)
-- ✗ Upload history
-- ✗ Audit logs
-- ✗ User-created mapping profiles
-- ============================================================================

-- Confirmation
SELECT 
  'Database reset complete!' AS status,
  (SELECT COUNT(*) FROM public.budgets) AS budgets_count,
  (SELECT COUNT(*) FROM public.actuals) AS actuals_count,
  (SELECT COUNT(*) FROM public.transactions) AS transactions_count,
  (SELECT COUNT(*) FROM public.revenues) AS revenues_count;
