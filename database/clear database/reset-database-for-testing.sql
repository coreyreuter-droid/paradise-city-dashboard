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
-- STEP 2: Clear rollup tables
-- ============================================================================

DO $$
BEGIN
  -- Budget/Actuals rollups
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_actuals_year_fund_department') THEN
    TRUNCATE TABLE public.budget_actuals_year_fund_department CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budget_actuals_year_fund') THEN
    TRUNCATE TABLE public.budget_actuals_year_fund CASCADE;
  END IF;
  
  -- Transaction rollups
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transaction_year_fund_department') THEN
    TRUNCATE TABLE public.transaction_year_fund_department CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transaction_year_fund') THEN
    TRUNCATE TABLE public.transaction_year_fund CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transaction_year_vendor') THEN
    TRUNCATE TABLE public.transaction_year_vendor CASCADE;
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
-- STEP 4: Clear ingestion system tables
-- ============================================================================

DO $$
BEGIN
  -- Clear ingestion row errors first (has FK to jobs)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ingestion_row_errors') THEN
    TRUNCATE TABLE public.ingestion_row_errors CASCADE;
  END IF;
  
  -- Clear ingestion jobs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ingestion_jobs') THEN
    TRUNCATE TABLE public.ingestion_jobs CASCADE;
  END IF;
  
  -- Clear raw files
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'raw_files') THEN
    TRUNCATE TABLE public.raw_files CASCADE;
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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'data_uploads') THEN
    TRUNCATE TABLE public.data_uploads CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_audit_log') THEN
    TRUNCATE TABLE public.admin_audit_log CASCADE;
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Clear rate limits (optional - allows fresh API calls)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rate_limits') THEN
    TRUNCATE TABLE public.rate_limits CASCADE;
  END IF;
END $$;

-- ============================================================================
-- WHAT'S PRESERVED:
-- ============================================================================
-- ✓ User accounts (public.profiles)
-- ✓ Portal settings (public.portal_settings)
-- ✓ Auth users (auth.users)
-- ✓ System mapping profiles (Default Template for each dataset type)
-- ✓ Capital projects (if you have any)
--
-- WHAT'S CLEARED:
-- ✗ All financial data (budgets, actuals, transactions, revenues)
-- ✗ All rollup tables
-- ✗ All lookup tables (funds_dim, departments_dim)
-- ✗ Upload history
-- ✗ Audit logs
-- ✗ Ingestion jobs and errors
-- ✗ User-created mapping profiles
-- ============================================================================

-- Confirmation
SELECT 
  'Database reset complete!' AS status,
  (SELECT COUNT(*) FROM public.budgets) AS budgets_count,
  (SELECT COUNT(*) FROM public.actuals) AS actuals_count,
  (SELECT COUNT(*) FROM public.transactions) AS transactions_count,
  (SELECT COUNT(*) FROM public.revenues) AS revenues_count;