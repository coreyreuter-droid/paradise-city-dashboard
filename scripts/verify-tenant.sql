-- ============================================================================
-- VERIFY TENANT SETUP
-- ============================================================================
-- Run this after setting up a new customer database to verify everything
-- is configured correctly.
--
-- Expected: All checks should return 0 rows (except CHECK 2 which shows status)
-- ============================================================================

-- ============================================================================
-- CHECK 1: SECURITY DEFINER functions are locked down
-- ============================================================================
-- These functions run with elevated privileges and should NOT be callable
-- by anonymous or authenticated users (except approved helpers).

SELECT '=== CHECK 1: SECURITY DEFINER functions exposed to anon/authenticated ===' AS check_name;

SELECT
  p.proname AS function_name,
  CASE WHEN has_function_privilege('anon', p.oid, 'EXECUTE') THEN 'YES' ELSE 'NO' END AS anon_can_execute,
  CASE WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN 'YES' ELSE 'NO' END AS auth_can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND p.proname NOT IN (
    -- Approved functions that need to be callable
    'is_portal_published',
    'audit_log_publish_toggle'
  )
  AND (
    has_function_privilege('anon', p.oid, 'EXECUTE')
    OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
  );

-- Expected: 0 rows

-- ============================================================================
-- CHECK 2: RLS is enabled on all data tables
-- ============================================================================

SELECT '=== CHECK 2: RLS status on data tables ===' AS check_name;

SELECT
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN '✓ Enabled' ELSE '✗ DISABLED' END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'portal_settings', 
    'budgets',
    'actuals',
    'transactions',
    'revenues',
    'budget_actuals_year_department',
    'budget_actuals_year_totals',
    'transaction_year_department',
    'transaction_year_vendor',
    'data_uploads',
    'admin_audit_log',
    'rate_limits'
  )
ORDER BY tablename;

-- Expected: All should show "✓ Enabled"

-- ============================================================================
-- CHECK 3: Required functions exist
-- ============================================================================

SELECT '=== CHECK 3: Required functions exist ===' AS check_name;

SELECT 
  'is_portal_published' AS function_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_portal_published'
  ) THEN '✓ Exists' ELSE '✗ MISSING' END AS status
UNION ALL
SELECT 
  'get_fiscal_years_for_table',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_fiscal_years_for_table'
  ) THEN '✓ Exists' ELSE '✗ MISSING' END
UNION ALL
SELECT 
  'search_count_departments',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'search_count_departments'
  ) THEN '✓ Exists' ELSE '✗ MISSING' END
UNION ALL
SELECT 
  'search_count_vendors',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'search_count_vendors'
  ) THEN '✓ Exists' ELSE '✗ MISSING' END
UNION ALL
SELECT 
  'refresh_budget_actuals_rollup_for_year',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'refresh_budget_actuals_rollup_for_year'
  ) THEN '✓ Exists' ELSE '✗ MISSING' END
UNION ALL
SELECT 
  'refresh_transaction_rollups_for_year',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'refresh_transaction_rollups_for_year'
  ) THEN '✓ Exists' ELSE '✗ MISSING' END;

-- Expected: All should show "✓ Exists"

-- ============================================================================
-- CHECK 4: Portal settings row exists
-- ============================================================================

SELECT '=== CHECK 4: Portal settings initialized ===' AS check_name;

SELECT 
  CASE WHEN COUNT(*) = 1 THEN '✓ Portal settings row exists' 
       ELSE '✗ MISSING - run: INSERT INTO portal_settings (id) VALUES (1)' 
  END AS status
FROM portal_settings
WHERE id = 1;

-- Expected: "✓ Portal settings row exists"

-- ============================================================================
-- CHECK 5: Rate limits table exists
-- ============================================================================

SELECT '=== CHECK 5: Rate limits table ===' AS check_name;

SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'rate_limits'
  ) THEN '✓ rate_limits table exists' 
  ELSE '✗ MISSING - run migrations/001_rate_limits.sql' 
  END AS status;

-- Expected: "✓ rate_limits table exists"

-- ============================================================================
-- CHECK 6: Helper function permissions
-- ============================================================================

SELECT '=== CHECK 6: Helper function permissions ===' AS check_name;

SELECT
  'is_portal_published' AS function_name,
  CASE WHEN has_function_privilege('anon', 'is_portal_published()', 'EXECUTE') 
       THEN '✓ anon can execute' 
       ELSE '✗ anon CANNOT execute (RLS will fail)' 
  END AS anon_status,
  CASE WHEN has_function_privilege('authenticated', 'is_portal_published()', 'EXECUTE') 
       THEN '✓ auth can execute' 
       ELSE '✗ auth CANNOT execute' 
  END AS auth_status;

-- Expected: Both should show "✓"

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '=== VERIFICATION COMPLETE ===' AS summary;
SELECT 'If all checks passed, this tenant is ready for use.' AS next_steps;
SELECT 'If any checks failed, see ONBOARDING.md for remediation steps.' AS help;
