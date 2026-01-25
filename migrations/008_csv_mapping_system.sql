-- ============================================================================
-- MIGRATION 008: CSV Mapping System
-- ============================================================================
-- Version: 1.0
-- Date: January 2025
-- 
-- This migration adds the complete CSV mapping and ingestion system:
--   - Ingestion profiles (saved column mappings)
--   - Raw file storage tracking
--   - Async job execution with checkpointing
--   - Code-to-name lookup tables (funds, departments)
--   - Performance indexes for coverage queries
--   - Automatic updated_at triggers
--
-- Prerequisites: 
--   - schema.sql and migrations 001-007 must be run first
--   - Create 'raw-uploads' storage bucket after running this migration
--
-- ============================================================================


-- ============================================================================
-- 1. UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
-- Shared trigger function for automatic timestamp updates

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 2. INGESTION PROFILES TABLE
-- ============================================================================
-- Stores saved column mappings per dataset type

CREATE TABLE public.ingestion_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_type TEXT NOT NULL CHECK (dataset_type IN (
    'budgets', 'actuals', 'transactions', 'revenues', 
    'funds_lookup', 'departments_lookup'
  )),
  name TEXT NOT NULL DEFAULT 'Default',
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Column mapping configuration (JSON)
  column_mappings JSONB NOT NULL DEFAULT '{}',
  
  -- Header configuration
  header_row_index INTEGER NOT NULL DEFAULT 1,
  skip_rows_after_header INTEGER NOT NULL DEFAULT 0,
  
  -- COA (Chart of Accounts) parsing configuration
  coa_enabled BOOLEAN NOT NULL DEFAULT false,
  coa_source_column TEXT,
  coa_delimiter TEXT DEFAULT '-',
  coa_segment_order JSONB,  -- e.g., ["fund", "department", "account"]
  coa_expected_segments INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.ingestion_profiles ENABLE ROW LEVEL SECURITY;

-- Only one active profile per dataset type
CREATE UNIQUE INDEX idx_one_active_profile_per_dataset 
  ON public.ingestion_profiles (dataset_type) 
  WHERE is_active = true;

-- Index for listing profiles
CREATE INDEX idx_ingestion_profiles_dataset_type 
  ON public.ingestion_profiles (dataset_type);

-- Updated_at trigger
CREATE TRIGGER update_ingestion_profiles_updated_at 
  BEFORE UPDATE ON public.ingestion_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 3. RAW FILES TABLE
-- ============================================================================
-- Tracks uploaded CSV files stored in the raw-uploads bucket

CREATE TABLE public.raw_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_type TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  checksum TEXT NOT NULL,  -- SHA-256 hash for duplicate detection
  storage_path TEXT NOT NULL,  -- Path in raw-uploads bucket
  row_count INTEGER,  -- Populated after parsing
  
  -- Metadata
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.raw_files ENABLE ROW LEVEL SECURITY;

-- Index for duplicate detection
CREATE INDEX idx_raw_files_checksum ON public.raw_files (checksum);

-- Index for cleanup queries
CREATE INDEX idx_raw_files_uploaded_at ON public.raw_files (uploaded_at);


-- ============================================================================
-- 4. INGESTION JOBS TABLE
-- ============================================================================
-- Tracks async import jobs with checkpointing for reliability

CREATE TABLE public.ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_file_id UUID REFERENCES public.raw_files(id),
  profile_id UUID REFERENCES public.ingestion_profiles(id),
  
  -- Snapshot of profile config at job creation time (for reproducibility)
  profile_snapshot JSONB NOT NULL,
  
  dataset_type TEXT NOT NULL,
  
  -- Job status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'validating', 'validated', 'importing', 
    'completed', 'completed_with_warnings', 'failed'
  )),
  
  -- Import mode
  import_mode TEXT NOT NULL DEFAULT 'append' CHECK (import_mode IN (
    'append', 'replace_year', 'replace_batch', 'replace_all'
  )),
  replace_target_year INTEGER,  -- For replace_year mode
  replace_target_batch_id UUID,  -- For replace_batch mode
  
  -- Progress metrics
  rows_total INTEGER DEFAULT 0,
  rows_validated INTEGER DEFAULT 0,
  rows_loaded INTEGER DEFAULT 0,
  rows_rejected INTEGER DEFAULT 0,
  rows_warned INTEGER DEFAULT 0,
  
  -- COA parsing metrics
  coa_parse_attempted INTEGER DEFAULT 0,
  coa_parse_succeeded INTEGER DEFAULT 0,
  coa_parse_failed INTEGER DEFAULT 0,
  
  -- Checkpointing for resume after failure
  checkpoint_row_number INTEGER DEFAULT 0,
  
  -- Worker locking (prevents duplicate processing)
  locked_at TIMESTAMPTZ,
  locked_by TEXT,  -- Worker identifier
  
  -- Retry tracking
  attempt_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  -- Delete safety flag (prevents re-deletion on retry)
  delete_applied BOOLEAN DEFAULT false,
  
  -- Coverage summary (computed after import for financial datasets)
  -- Example: {"fund_label_coverage_pct": 96, "department_label_coverage_pct": 61, ...}
  coverage_summary JSONB,
  
  -- Detected fiscal years in the data
  detected_years JSONB,
  
  -- Preview of what will be deleted (for replace modes)
  delete_preview JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  validation_completed_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;

-- Index for worker claim query
CREATE INDEX idx_ingestion_jobs_status_locked 
  ON public.ingestion_jobs (status, locked_at) 
  WHERE status IN ('pending', 'validating', 'importing');

-- Index for job listing
CREATE INDEX idx_ingestion_jobs_created_at 
  ON public.ingestion_jobs (created_at DESC);

-- Updated_at trigger
CREATE TRIGGER update_ingestion_jobs_updated_at 
  BEFORE UPDATE ON public.ingestion_jobs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 5. INGESTION ROW ERRORS TABLE
-- ============================================================================
-- Stores validation errors and warnings per row

CREATE TABLE public.ingestion_row_errors (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.ingestion_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  error_code TEXT NOT NULL,
  error_level TEXT NOT NULL CHECK (error_level IN ('error', 'warning')),
  message TEXT NOT NULL,
  field_name TEXT,
  field_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ingestion_row_errors ENABLE ROW LEVEL SECURITY;

-- Index for fetching errors by job
CREATE INDEX idx_ingestion_row_errors_job_id 
  ON public.ingestion_row_errors (job_id);

-- Index for error report generation
CREATE INDEX idx_ingestion_row_errors_job_row 
  ON public.ingestion_row_errors (job_id, row_number);


-- ============================================================================
-- 6. FUNDS DIMENSION TABLE (Lookup)
-- ============================================================================
-- Code-to-name mapping for funds

CREATE TABLE public.funds_dim (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_code TEXT NOT NULL,  -- Normalized: trimmed, leading zeros preserved
  fund_name TEXT NOT NULL,  -- Min length 2
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Track which import job created/updated this row
  job_id UUID REFERENCES public.ingestion_jobs(id),
  source_row_number INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.funds_dim ENABLE ROW LEVEL SECURITY;

-- Unique constraint on fund_code for upsert
CREATE UNIQUE INDEX funds_dim_code_unique ON public.funds_dim (fund_code);

-- Index for active funds lookup
CREATE INDEX idx_funds_dim_active ON public.funds_dim (is_active) WHERE is_active = true;

-- Updated_at trigger
CREATE TRIGGER update_funds_dim_updated_at 
  BEFORE UPDATE ON public.funds_dim 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 7. DEPARTMENTS DIMENSION TABLE (Lookup)
-- ============================================================================
-- Code-to-name mapping for departments

CREATE TABLE public.departments_dim (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_code TEXT NOT NULL,  -- Normalized: trimmed, leading zeros preserved
  department_name TEXT NOT NULL,  -- Min length 2
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Track which import job created/updated this row
  job_id UUID REFERENCES public.ingestion_jobs(id),
  source_row_number INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.departments_dim ENABLE ROW LEVEL SECURITY;

-- Unique constraint on department_code for upsert
CREATE UNIQUE INDEX departments_dim_code_unique ON public.departments_dim (department_code);

-- Index for active departments lookup
CREATE INDEX idx_departments_dim_active ON public.departments_dim (is_active) WHERE is_active = true;

-- Updated_at trigger
CREATE TRIGGER update_departments_dim_updated_at 
  BEFORE UPDATE ON public.departments_dim 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 8. MODIFY EXISTING FACT TABLES
-- ============================================================================
-- Add columns for job tracking and raw account strings

-- TRANSACTIONS
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS account_string_raw TEXT,
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.ingestion_jobs(id),
  ADD COLUMN IF NOT EXISTS source_row_number INTEGER;

-- BUDGETS
ALTER TABLE public.budgets 
  ADD COLUMN IF NOT EXISTS account_string_raw TEXT,
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.ingestion_jobs(id),
  ADD COLUMN IF NOT EXISTS source_row_number INTEGER;

-- ACTUALS
ALTER TABLE public.actuals 
  ADD COLUMN IF NOT EXISTS account_string_raw TEXT,
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.ingestion_jobs(id),
  ADD COLUMN IF NOT EXISTS source_row_number INTEGER;

-- REVENUES
ALTER TABLE public.revenues 
  ADD COLUMN IF NOT EXISTS account_string_raw TEXT,
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.ingestion_jobs(id),
  ADD COLUMN IF NOT EXISTS source_row_number INTEGER;


-- ============================================================================
-- 9. PERFORMANCE INDEXES ON FACT TABLES
-- ============================================================================
-- Critical for unmapped codes queries and coverage calculations

-- TRANSACTIONS indexes
CREATE INDEX IF NOT EXISTS idx_transactions_fund_code 
  ON public.transactions (fund_code);
CREATE INDEX IF NOT EXISTS idx_transactions_department_code 
  ON public.transactions (department_code);
CREATE INDEX IF NOT EXISTS idx_transactions_job_id 
  ON public.transactions (job_id);
CREATE INDEX IF NOT EXISTS idx_transactions_fy_fund 
  ON public.transactions (fiscal_year, fund_code);

-- BUDGETS indexes
CREATE INDEX IF NOT EXISTS idx_budgets_fund_code 
  ON public.budgets (fund_code);
CREATE INDEX IF NOT EXISTS idx_budgets_department_code 
  ON public.budgets (department_code);
CREATE INDEX IF NOT EXISTS idx_budgets_job_id 
  ON public.budgets (job_id);

-- ACTUALS indexes
CREATE INDEX IF NOT EXISTS idx_actuals_fund_code 
  ON public.actuals (fund_code);
CREATE INDEX IF NOT EXISTS idx_actuals_department_code 
  ON public.actuals (department_code);
CREATE INDEX IF NOT EXISTS idx_actuals_job_id 
  ON public.actuals (job_id);
CREATE INDEX IF NOT EXISTS idx_actuals_fy_fund 
  ON public.actuals (fiscal_year, fund_code);

-- REVENUES indexes
CREATE INDEX IF NOT EXISTS idx_revenues_fund_code 
  ON public.revenues (fund_code);
CREATE INDEX IF NOT EXISTS idx_revenues_department_code 
  ON public.revenues (department_code);
CREATE INDEX IF NOT EXISTS idx_revenues_job_id 
  ON public.revenues (job_id);


-- ============================================================================
-- 10. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- INGESTION PROFILES: Admins only
CREATE POLICY "ingestion_profiles_admin_all" ON public.ingestion_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- RAW FILES: Admins only
CREATE POLICY "raw_files_admin_all" ON public.raw_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- INGESTION JOBS: Admins only
CREATE POLICY "ingestion_jobs_admin_all" ON public.ingestion_jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- INGESTION ROW ERRORS: Admins only
CREATE POLICY "ingestion_row_errors_admin_all" ON public.ingestion_row_errors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- FUNDS DIM: Public read when published, admin write
CREATE POLICY "funds_dim_public_read" ON public.funds_dim
  FOR SELECT USING (is_portal_published());

CREATE POLICY "funds_dim_admin_all" ON public.funds_dim
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- DEPARTMENTS DIM: Public read when published, admin write
CREATE POLICY "departments_dim_public_read" ON public.departments_dim
  FOR SELECT USING (is_portal_published());

CREATE POLICY "departments_dim_admin_all" ON public.departments_dim
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );


-- ============================================================================
-- 11. HELPER FUNCTIONS
-- ============================================================================

-- Function to normalize codes (trim whitespace, preserve leading zeros)
CREATE OR REPLACE FUNCTION public.normalize_code(value TEXT)
RETURNS TEXT AS $$
BEGIN
  IF value IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Trim whitespace
  value := TRIM(value);
  
  -- Return NULL for empty strings
  IF value = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN value;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================================
-- 12. VERIFICATION
-- ============================================================================
-- Run this query to verify migration succeeded

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'ingestion_profiles',
      'raw_files', 
      'ingestion_jobs',
      'ingestion_row_errors',
      'funds_dim',
      'departments_dim'
    );
  
  IF table_count = 6 THEN
    RAISE NOTICE 'Migration 008 SUCCESS: All 6 tables created';
  ELSE
    RAISE EXCEPTION 'Migration 008 FAILED: Only % of 6 tables found', table_count;
  END IF;
END $$;


-- ============================================================================
-- 13. STORAGE POLICIES FOR RAW-UPLOADS BUCKET
-- ============================================================================
-- NOTE: You must manually create the 'raw-uploads' bucket in Supabase Storage
-- BEFORE running these policies. Settings: Public = OFF (private bucket)

-- Admins can upload raw files
CREATE POLICY "Admins can upload raw files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'raw-uploads' 
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Admins can read raw files
CREATE POLICY "Admins can read raw files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'raw-uploads'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Admins can delete raw files
CREATE POLICY "Admins can delete raw files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'raw-uploads'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
  )
);


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
