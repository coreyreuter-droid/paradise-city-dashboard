
-- ============================================================================
-- MAKE NAME FIELDS NULLABLE (for code-only imports)
-- ============================================================================
-- 
-- Many cities export CSVs with only codes (no names).
-- Names can come from lookup tables (funds_dim, departments_dim) instead.
-- This allows importing data where fund_name, department_name, etc. are NULL.
--

-- BUDGETS TABLE
ALTER TABLE public.budgets 
  ALTER COLUMN fund_name DROP NOT NULL,
  ALTER COLUMN department_name DROP NOT NULL,
  ALTER COLUMN category DROP NOT NULL,
  ALTER COLUMN account_name DROP NOT NULL;

-- ACTUALS TABLE
ALTER TABLE public.actuals 
  ALTER COLUMN fund_name DROP NOT NULL,
  ALTER COLUMN department_name DROP NOT NULL,
  ALTER COLUMN category DROP NOT NULL,
  ALTER COLUMN account_name DROP NOT NULL;

-- TRANSACTIONS TABLE (only if columns exist with NOT NULL)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions' 
    AND column_name = 'fund_name'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.transactions ALTER COLUMN fund_name DROP NOT NULL;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions' 
    AND column_name = 'department_name'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.transactions ALTER COLUMN department_name DROP NOT NULL;
  END IF;
END $$;

-- REVENUES TABLE (only if columns exist with NOT NULL)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'revenues' 
    AND column_name = 'fund_name'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.revenues ALTER COLUMN fund_name DROP NOT NULL;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'revenues' 
    AND column_name = 'department_name'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.revenues ALTER COLUMN department_name DROP NOT NULL;
  END IF;
END $$;


-- ============================================================================
-- POST-MIGRATION STEPS (Manual)
-- ============================================================================
-- 
-- 1. Create storage bucket 'raw-uploads' in Supabase Storage:
--    - Public: NO (private bucket)
--    - Allowed MIME types: text/csv, application/vnd.ms-excel
--    - Max file size: 50MB
--
-- 2. Set WORKER_SECRET environment variable in Vercel for cron job auth
--
-- ============================================================================
