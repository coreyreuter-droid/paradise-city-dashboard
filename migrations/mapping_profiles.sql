-- ============================================================================
-- Migration: Mapping Profiles
-- Allows users to save and reuse column mappings for different CSV formats
-- ============================================================================

-- Create mapping_profiles table
CREATE TABLE IF NOT EXISTS public.mapping_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  dataset_type TEXT NOT NULL CHECK (dataset_type IN ('budgets', 'actuals', 'transactions', 'revenues', 'funds_lookup', 'departments_lookup')),
  column_mappings JSONB NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,  -- System profiles (Default Template) cannot be deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate names within the same dataset type
  UNIQUE(name, dataset_type)
);

-- Create index for fast lookups by dataset_type
CREATE INDEX IF NOT EXISTS idx_mapping_profiles_dataset_type ON public.mapping_profiles(dataset_type);

-- Enable RLS
ALTER TABLE public.mapping_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read all profiles
CREATE POLICY "Admins can read mapping_profiles"
  ON public.mapping_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policy: Admins can insert new profiles
CREATE POLICY "Admins can insert mapping_profiles"
  ON public.mapping_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    is_system = FALSE AND  -- Cannot create system profiles via API
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policy: Admins can update non-system profiles
CREATE POLICY "Admins can update mapping_profiles"
  ON public.mapping_profiles FOR UPDATE
  TO authenticated
  USING (
    is_system = FALSE AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    is_system = FALSE AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policy: Admins can delete non-system profiles
CREATE POLICY "Admins can delete mapping_profiles"
  ON public.mapping_profiles FOR DELETE
  TO authenticated
  USING (
    is_system = FALSE AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- Seed default templates (system profiles)
-- These map standard column names to themselves
-- ============================================================================

INSERT INTO public.mapping_profiles (name, dataset_type, column_mappings, is_system) VALUES
(
  'Default Template',
  'budgets',
  '{
    "fiscal_year": "fiscal_year",
    "fund_code": "fund_code",
    "fund_name": "fund_name",
    "department_code": "department_code",
    "department_name": "department_name",
    "category": "category",
    "account_code": "account_code",
    "account_name": "account_name",
    "amount": "amount"
  }'::jsonb,
  TRUE
),
(
  'Default Template',
  'actuals',
  '{
    "fiscal_year": "fiscal_year",
    "period": "period",
    "fund_code": "fund_code",
    "fund_name": "fund_name",
    "department_code": "department_code",
    "department_name": "department_name",
    "category": "category",
    "account_code": "account_code",
    "account_name": "account_name",
    "amount": "amount"
  }'::jsonb,
  TRUE
),
(
  'Default Template',
  'transactions',
  '{
    "fiscal_year": "fiscal_year",
    "date": "date",
    "fund_code": "fund_code",
    "fund_name": "fund_name",
    "department_code": "department_code",
    "department_name": "department_name",
    "account_code": "account_code",
    "account_name": "account_name",
    "vendor": "vendor",
    "description": "description",
    "amount": "amount"
  }'::jsonb,
  TRUE
),
(
  'Default Template',
  'revenues',
  '{
    "fiscal_year": "fiscal_year",
    "period": "period",
    "fund_code": "fund_code",
    "fund_name": "fund_name",
    "department_code": "department_code",
    "department_name": "department_name",
    "category": "category",
    "account_code": "account_code",
    "account_name": "account_name",
    "amount": "amount"
  }'::jsonb,
  TRUE
),
(
  'Default Template',
  'funds_lookup',
  '{
    "fund_code": "fund_code",
    "fund_name": "fund_name"
  }'::jsonb,
  TRUE
),
(
  'Default Template',
  'departments_lookup',
  '{
    "department_code": "department_code",
    "department_name": "department_name"
  }'::jsonb,
  TRUE
)
ON CONFLICT (name, dataset_type) DO NOTHING;

-- ============================================================================
-- Update trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_mapping_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mapping_profiles_updated_at ON public.mapping_profiles;

CREATE TRIGGER trigger_mapping_profiles_updated_at
  BEFORE UPDATE ON public.mapping_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_mapping_profiles_updated_at();
