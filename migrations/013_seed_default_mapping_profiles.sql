-- =============================================================================
-- Migration 013: Seed Default System Mapping Profiles
-- =============================================================================
-- Creates system default profiles for each dataset type with original_headers
-- set for position-based matching. These profiles match files downloaded from
-- the "Download template" button in the UI.
--
-- Run AFTER: 012_add_original_headers.sql
-- =============================================================================

-- Delete any existing system profiles first (to avoid duplicates on re-run)
DELETE FROM mapping_profiles WHERE is_system = true;

-- =============================================================================
-- BUDGETS - Default Template
-- =============================================================================
-- Headers: fiscal_year, fund_code, fund_name, department_code, department_name, 
--          category, account_code, account_name, amount
INSERT INTO mapping_profiles (
  name, 
  dataset_type, 
  column_mappings, 
  original_headers,
  is_system
) VALUES (
  'CiviPortal Default',
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
  ARRAY['fiscal_year', 'fund_code', 'fund_name', 'department_code', 'department_name', 'category', 'account_code', 'account_name', 'amount'],
  true
);

-- =============================================================================
-- ACTUALS - Default Template
-- =============================================================================
-- Headers: fiscal_year, period, fund_code, fund_name, department_code, 
--          department_name, category, account_code, account_name, amount
INSERT INTO mapping_profiles (
  name, 
  dataset_type, 
  column_mappings, 
  original_headers,
  is_system
) VALUES (
  'CiviPortal Default',
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
  ARRAY['fiscal_year', 'period', 'fund_code', 'fund_name', 'department_code', 'department_name', 'category', 'account_code', 'account_name', 'amount'],
  true
);

-- =============================================================================
-- TRANSACTIONS - Default Template
-- =============================================================================
-- Headers: date, fiscal_year, fund_code, fund_name, department_code, 
--          department_name, account_code, account_name, vendor, description, amount
INSERT INTO mapping_profiles (
  name, 
  dataset_type, 
  column_mappings, 
  original_headers,
  is_system
) VALUES (
  'CiviPortal Default',
  'transactions',
  '{
    "date": "date",
    "fiscal_year": "fiscal_year",
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
  ARRAY['date', 'fiscal_year', 'fund_code', 'fund_name', 'department_code', 'department_name', 'account_code', 'account_name', 'vendor', 'description', 'amount'],
  true
);

-- =============================================================================
-- REVENUES - Default Template
-- =============================================================================
-- Headers: fiscal_year, period, fund_code, fund_name, department_code, 
--          department_name, category, account_code, account_name, amount
INSERT INTO mapping_profiles (
  name, 
  dataset_type, 
  column_mappings, 
  original_headers,
  is_system
) VALUES (
  'CiviPortal Default',
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
  ARRAY['fiscal_year', 'period', 'fund_code', 'fund_name', 'department_code', 'department_name', 'category', 'account_code', 'account_name', 'amount'],
  true
);

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
  profile_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count
  FROM mapping_profiles
  WHERE is_system = true AND original_headers IS NOT NULL;
  
  IF profile_count != 4 THEN
    RAISE EXCEPTION 'Migration 013 FAILED - Expected 4 system profiles, found %', profile_count;
  END IF;
  
  RAISE NOTICE '=== Migration 013 Complete ===';
  RAISE NOTICE 'Created 4 default system mapping profiles:';
  RAISE NOTICE '  - budgets (9 columns)';
  RAISE NOTICE '  - actuals (10 columns)';
  RAISE NOTICE '  - transactions (11 columns)';
  RAISE NOTICE '  - revenues (10 columns)';
END $$;
