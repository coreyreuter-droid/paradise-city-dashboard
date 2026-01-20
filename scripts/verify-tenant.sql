-- ============================================================================
-- VERIFY TENANT SETUP
-- ============================================================================
-- Run this after setting up a new customer database to verify everything
-- is configured correctly.
--
-- Expected: All rows should show "PASS"
-- ============================================================================

SELECT 'RLS Enabled' AS check_type, tablename AS item, 
  CASE WHEN rowsecurity THEN 'PASS' ELSE 'FAIL' END AS status
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
    'transaction_year_department',
    'transaction_year_vendor',
    'data_uploads',
    'admin_audit_log',
    'rate_limits'
  )

UNION ALL

SELECT 'Function Exists', proname, 'PASS'
FROM pg_proc p 
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN (
    'is_portal_published',
    'get_fiscal_years_for_table',
    'search_count_departments',
    'search_count_vendors',
    'refresh_budget_actuals_rollup_for_year',
    'refresh_transaction_rollups_for_year'
  )

UNION ALL

SELECT 'View Exists', table_name, 'PASS'
FROM information_schema.views
WHERE table_schema = 'public' 
  AND table_name IN (
    'budget_actuals_year_totals',
    'transaction_year_totals',
    'revenue_year_totals'
  )

UNION ALL

SELECT 'Portal Settings', 'Row exists', 
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END
FROM portal_settings 
WHERE id = 1

UNION ALL

SELECT 'Security', 'SECURITY DEFINER locked down',
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND p.proname NOT IN ('is_portal_published', 'get_fiscal_years_for_table', 'audit_log_publish_toggle')
  AND (
    has_function_privilege('anon', p.oid, 'EXECUTE')
    OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
  )

UNION ALL

SELECT 'Permissions', 'is_portal_published callable by anon',
  CASE WHEN has_function_privilege('anon', 'is_portal_published()', 'EXECUTE') 
    THEN 'PASS' ELSE 'FAIL' END

ORDER BY check_type, item;

-- ============================================================================
-- EXPECTED RESULTS: ~24 rows, ALL should say "PASS"
--
-- If any row says "FAIL":
--   - RLS FAIL: ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;
--   - Function missing: Re-run schema.sql or relevant migration
--   - View missing: Run migrations/004_add_totals_views.sql
--   - Portal Settings FAIL: INSERT INTO portal_settings (id) VALUES (1);
--   - Security FAIL: Run migrations/002_lock_down_security_definer.sql
--   - Permissions FAIL: GRANT EXECUTE ON FUNCTION is_portal_published() TO anon;
-- ============================================================================