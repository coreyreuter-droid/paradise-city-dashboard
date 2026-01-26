-- ============================================================================
-- MIGRATION 008: Complete CSV Mapping & Audit System
-- ============================================================================
-- 
-- This migration adds:
--   1. Lookup tables (funds_dim, departments_dim) for code → name resolution
--   2. Ingestion system (raw_files, ingestion_jobs) for upload tracking
--   3. Mapping profiles for saving column configurations
--   4. ALTER statements to make name fields nullable (code-only imports)
--   5. Branding audit trigger for tracking settings changes
--
-- Run AFTER: schema.sql and migrations 001-007
-- Run BEFORE: CiviPortal_Rollup_Migration (009) which requires lookup tables
--
-- ============================================================================


-- ============================================================================
-- 1. LOOKUP TABLES (for code → name resolution)
-- ============================================================================

-- Funds lookup table
CREATE TABLE IF NOT EXISTS public.funds_dim (
  fund_code TEXT PRIMARY KEY,
  fund_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments lookup table  
CREATE TABLE IF NOT EXISTS public.departments_dim (
  department_code TEXT PRIMARY KEY,
  department_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lookup performance
CREATE INDEX IF NOT EXISTS idx_funds_dim_active ON public.funds_dim(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_departments_dim_active ON public.departments_dim(is_active) WHERE is_active = TRUE;

-- RLS for lookup tables
ALTER TABLE public.funds_dim ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments_dim ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-runnability)
DROP POLICY IF EXISTS "Public read funds_dim" ON public.funds_dim;
DROP POLICY IF EXISTS "Public read departments_dim" ON public.departments_dim;
DROP POLICY IF EXISTS "Admin write funds_dim" ON public.funds_dim;
DROP POLICY IF EXISTS "Admin write departments_dim" ON public.departments_dim;

-- Public read for lookups (needed for views)
CREATE POLICY "Public read funds_dim" ON public.funds_dim FOR SELECT USING (TRUE);
CREATE POLICY "Public read departments_dim" ON public.departments_dim FOR SELECT USING (TRUE);

-- Admin write for lookups
CREATE POLICY "Admin write funds_dim" ON public.funds_dim FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "Admin write departments_dim" ON public.departments_dim FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));


-- ============================================================================
-- 2. RAW FILES TABLE (tracks uploaded CSV files)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.raw_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Parsed metadata
  row_count INTEGER,
  column_headers JSONB,
  sample_rows JSONB,
  
  -- Status
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'validated', 'processing', 'processed', 'error')),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_raw_files_status ON public.raw_files(status);
CREATE INDEX IF NOT EXISTS idx_raw_files_uploaded_at ON public.raw_files(uploaded_at DESC);

ALTER TABLE public.raw_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access raw_files" ON public.raw_files;
CREATE POLICY "Admin access raw_files" ON public.raw_files FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));


-- ============================================================================
-- 3. INGESTION JOBS TABLE (tracks import progress)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_file_id UUID REFERENCES public.raw_files(id) ON DELETE SET NULL,
  
  -- Configuration snapshot
  profile_snapshot JSONB NOT NULL,
  dataset_type TEXT NOT NULL CHECK (dataset_type IN ('budgets', 'actuals', 'transactions', 'revenues', 'funds_lookup', 'departments_lookup')),
  import_mode TEXT NOT NULL CHECK (import_mode IN ('append', 'replace_year', 'replace_table')),
  replace_target_year INTEGER,
  
  -- Progress tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'validating', 'validated', 'importing', 'processing', 'completed', 'completed_with_warnings', 'failed', 'cancelled')),
  rows_total INTEGER DEFAULT 0,
  rows_loaded INTEGER DEFAULT 0,
  rows_rejected INTEGER DEFAULT 0,
  checkpoint_row_number INTEGER DEFAULT 0,
  
  -- Error tracking
  last_error TEXT,
  rejected_rows JSONB,
  coverage_summary JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  
  -- Lock for concurrent processing
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  delete_applied BOOLEAN DEFAULT FALSE,
  attempt_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status ON public.ingestion_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_created_at ON public.ingestion_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_pending ON public.ingestion_jobs(status, created_at) WHERE status = 'pending';

ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access ingestion_jobs" ON public.ingestion_jobs;
CREATE POLICY "Admin access ingestion_jobs" ON public.ingestion_jobs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));


-- ============================================================================
-- 3.5 INGESTION ROW ERRORS TABLE (tracks validation errors per row)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ingestion_row_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.ingestion_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  field_name TEXT,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  raw_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_row_errors_job_id ON public.ingestion_row_errors(job_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_row_errors_row ON public.ingestion_row_errors(job_id, row_number);

ALTER TABLE public.ingestion_row_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin access ingestion_row_errors" ON public.ingestion_row_errors;
CREATE POLICY "Admin access ingestion_row_errors" ON public.ingestion_row_errors FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));


-- ============================================================================
-- 4. MAPPING PROFILES TABLE (saved column configurations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mapping_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  dataset_type TEXT NOT NULL CHECK (dataset_type IN ('budgets', 'actuals', 'transactions', 'revenues', 'funds_lookup', 'departments_lookup')),
  column_mappings JSONB NOT NULL,
  
  is_system BOOLEAN DEFAULT FALSE,
  header_row_index INTEGER DEFAULT 1,
  skip_rows_after_header INTEGER DEFAULT 0,
  
  -- COA parsing settings
  coa_enabled BOOLEAN DEFAULT FALSE,
  coa_source_column TEXT,
  coa_delimiter TEXT DEFAULT '-',
  coa_segment_order TEXT[],
  coa_expected_segments INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(name, dataset_type)
);

CREATE INDEX IF NOT EXISTS idx_mapping_profiles_dataset_type ON public.mapping_profiles(dataset_type);

ALTER TABLE public.mapping_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read mapping_profiles" ON public.mapping_profiles;
DROP POLICY IF EXISTS "Admins can insert mapping_profiles" ON public.mapping_profiles;
DROP POLICY IF EXISTS "Admins can update mapping_profiles" ON public.mapping_profiles;
DROP POLICY IF EXISTS "Admins can delete mapping_profiles" ON public.mapping_profiles;

CREATE POLICY "Admins can read mapping_profiles" ON public.mapping_profiles FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "Admins can insert mapping_profiles" ON public.mapping_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    is_system = FALSE AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admins can update mapping_profiles" ON public.mapping_profiles FOR UPDATE
  TO authenticated
  USING (
    is_system = FALSE AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    is_system = FALSE AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Admins can delete mapping_profiles" ON public.mapping_profiles FOR DELETE
  TO authenticated
  USING (
    is_system = FALSE AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );


-- ============================================================================
-- 5. DEFAULT MAPPING PROFILES
-- ============================================================================

INSERT INTO public.mapping_profiles (name, dataset_type, column_mappings, is_system)
VALUES 
  ('Default Template', 'budgets', '{"fiscal_year":"fiscal_year","fund_code":"fund_code","fund_name":"fund_name","department_code":"department_code","department_name":"department_name","category":"category","account_code":"account_code","account_name":"account_name","amount":"amount"}', TRUE),
  ('Default Template', 'actuals', '{"fiscal_year":"fiscal_year","period":"period","fund_code":"fund_code","fund_name":"fund_name","department_code":"department_code","department_name":"department_name","category":"category","account_code":"account_code","account_name":"account_name","amount":"amount"}', TRUE),
  ('Default Template', 'transactions', '{"date":"date","fiscal_year":"fiscal_year","fund_code":"fund_code","fund_name":"fund_name","department_code":"department_code","department_name":"department_name","account_code":"account_code","account_name":"account_name","vendor":"vendor","description":"description","amount":"amount"}', TRUE),
  ('Default Template', 'revenues', '{"fiscal_year":"fiscal_year","period":"period","fund_code":"fund_code","fund_name":"fund_name","department_code":"department_code","department_name":"department_name","category":"category","account_code":"account_code","account_name":"account_name","amount":"amount"}', TRUE),
  ('Default Template', 'funds_lookup', '{"fund_code":"fund_code","fund_name":"fund_name"}', TRUE),
  ('Default Template', 'departments_lookup', '{"department_code":"department_code","department_name":"department_name"}', TRUE)
ON CONFLICT (name, dataset_type) DO NOTHING;


-- ============================================================================
-- 6. MAKE NAME FIELDS NULLABLE (for code-only imports)
-- ============================================================================

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

-- TRANSACTIONS TABLE (conditional)
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

-- REVENUES TABLE (conditional)
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
-- 7. BRANDING AUDIT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_log_branding_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  changed_fields TEXT[] := ARRAY[]::TEXT[];
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  v_user_id := auth.uid();
  v_user_email := COALESCE(auth.jwt() ->> 'email', NULL);

  -- Check which fields changed (excluding is_published)
  IF OLD.city_name IS DISTINCT FROM NEW.city_name THEN
    changed_fields := array_append(changed_fields, 'city_name');
  END IF;
  IF OLD.tagline IS DISTINCT FROM NEW.tagline THEN
    changed_fields := array_append(changed_fields, 'tagline');
  END IF;
  IF OLD.primary_color IS DISTINCT FROM NEW.primary_color THEN
    changed_fields := array_append(changed_fields, 'primary_color');
  END IF;
  IF OLD.accent_color IS DISTINCT FROM NEW.accent_color THEN
    changed_fields := array_append(changed_fields, 'accent_color');
  END IF;
  IF OLD.background_color IS DISTINCT FROM NEW.background_color THEN
    changed_fields := array_append(changed_fields, 'background_color');
  END IF;
  IF OLD.logo_url IS DISTINCT FROM NEW.logo_url THEN
    changed_fields := array_append(changed_fields, 'logo_url');
  END IF;
  IF OLD.hero_image_url IS DISTINCT FROM NEW.hero_image_url THEN
    changed_fields := array_append(changed_fields, 'hero_image_url');
  END IF;
  IF OLD.hero_message IS DISTINCT FROM NEW.hero_message THEN
    changed_fields := array_append(changed_fields, 'hero_message');
  END IF;
  IF OLD.seal_url IS DISTINCT FROM NEW.seal_url THEN
    changed_fields := array_append(changed_fields, 'seal_url');
  END IF;
  IF OLD.leader_name IS DISTINCT FROM NEW.leader_name THEN
    changed_fields := array_append(changed_fields, 'leader_name');
  END IF;
  IF OLD.leader_title IS DISTINCT FROM NEW.leader_title THEN
    changed_fields := array_append(changed_fields, 'leader_title');
  END IF;
  IF OLD.leader_message IS DISTINCT FROM NEW.leader_message THEN
    changed_fields := array_append(changed_fields, 'leader_message');
  END IF;
  IF OLD.leader_photo_url IS DISTINCT FROM NEW.leader_photo_url THEN
    changed_fields := array_append(changed_fields, 'leader_photo_url');
  END IF;
  IF OLD.story_city_description IS DISTINCT FROM NEW.story_city_description THEN
    changed_fields := array_append(changed_fields, 'story_city_description');
  END IF;
  IF OLD.story_year_achievements IS DISTINCT FROM NEW.story_year_achievements THEN
    changed_fields := array_append(changed_fields, 'story_year_achievements');
  END IF;
  IF OLD.story_capital_projects IS DISTINCT FROM NEW.story_capital_projects THEN
    changed_fields := array_append(changed_fields, 'story_capital_projects');
  END IF;

  IF array_length(changed_fields, 1) > 0 THEN
    INSERT INTO public.admin_audit_log (
      actor_user_id,
      actor_email,
      action,
      target_table,
      status,
      meta
    ) VALUES (
      v_user_id,
      v_user_email,
      'branding.updated',
      'portal_settings',
      'SUCCESS',
      jsonb_build_object('changed_fields', changed_fields)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_branding_changes ON public.portal_settings;

CREATE TRIGGER trg_audit_log_branding_changes
  AFTER UPDATE ON public.portal_settings
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_branding_changes();


-- ============================================================================
-- 8. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  missing_tables TEXT := '';
BEGIN
  -- Check required tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'funds_dim') THEN
    missing_tables := missing_tables || 'funds_dim, ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments_dim') THEN
    missing_tables := missing_tables || 'departments_dim, ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'raw_files') THEN
    missing_tables := missing_tables || 'raw_files, ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ingestion_jobs') THEN
    missing_tables := missing_tables || 'ingestion_jobs, ';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mapping_profiles') THEN
    missing_tables := missing_tables || 'mapping_profiles, ';
  END IF;
  
  IF missing_tables != '' THEN
    RAISE EXCEPTION 'Migration 008 FAILED - Missing tables: %', missing_tables;
  END IF;
  
  RAISE NOTICE '=== Migration 008 Complete ===';
  RAISE NOTICE 'Tables: funds_dim, departments_dim, raw_files, ingestion_jobs, mapping_profiles';
  RAISE NOTICE 'Trigger: trg_audit_log_branding_changes on portal_settings';
  RAISE NOTICE '';
  RAISE NOTICE 'MANUAL STEPS:';
  RAISE NOTICE '1. Create storage bucket "raw-uploads" (private, 50MB max)';
  RAISE NOTICE '2. Set WORKER_SECRET env var in Vercel';
END $$;
