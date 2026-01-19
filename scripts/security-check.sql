-- =============================================================================
-- SECURITY VERIFICATION SCRIPT
-- =============================================================================
-- Run this against any customer database to verify security posture:
--   psql "$DATABASE_URL" -f scripts/security-check.sql
--
-- Expected results:
--   - Section 1: Should return ZERO rows (no PUBLIC execute on SECURITY DEFINER)
--   - Section 2: All data tables should show rowsecurity = true
--   - Section 3: Should return ZERO rows (no data tables without RLS)
-- =============================================================================

\echo ''
\echo '==========================================================================='
\echo 'CIVIPORTAL SECURITY CHECK'
\echo '==========================================================================='
\echo ''

-- =============================================================================
-- CHECK 1: SECURITY DEFINER functions with PUBLIC execute (CRITICAL)
-- =============================================================================
-- These functions run with owner privileges. If PUBLIC can execute them,
-- anonymous users can call them via Supabase RPC.
-- EXPECTED: Zero rows

\echo '>>> CHECK 1: SECURITY DEFINER functions executable by PUBLIC'
\echo '    Expected: 0 rows (if any appear, run migration 002)'
\echo ''

SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND has_function_privilege('PUBLIC', p.oid, 'EXECUTE');

-- =============================================================================
-- CHECK 2: RLS status on all public tables
-- =============================================================================
-- All data tables should have RLS enabled.
-- EXPECTED: All data tables show rowsecurity = true

\echo ''
\echo '>>> CHECK 2: RLS status on public tables'
\echo '    Review: data tables should show rowsecurity = true'
\echo ''

SELECT 
  c.relname AS table_name,
  c.relrowsecurity AS rowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'  -- ordinary tables only
ORDER BY c.relname;

-- =============================================================================
-- CHECK 3: Data tables WITHOUT RLS (CRITICAL)
-- =============================================================================
-- Core data tables must have RLS. Utility tables (like _migrations) may not.
-- EXPECTED: Zero data tables (budgets, actuals, transactions, revenues, etc.)

\echo ''
\echo '>>> CHECK 3: Tables WITHOUT RLS enabled'
\echo '    Expected: No data tables (budgets, actuals, transactions, revenues, profiles, portal_settings)'
\echo ''

SELECT c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false
  AND c.relname IN (
    'budgets', 'actuals', 'transactions', 'revenues',
    'profiles', 'portal_settings', 'data_uploads', 'admin_audit_log',
    'budget_actuals_year_department', 'budget_actuals_year_totals',
    'transaction_year_department', 'transaction_year_vendor', 'transaction_year_totals',
    'revenue_year_totals', 'capital_projects', 'capital_project_images'
  )
ORDER BY c.relname;

-- =============================================================================
-- CHECK 4: Verify anon role cannot execute SECURITY DEFINER functions
-- =============================================================================

\echo ''
\echo '>>> CHECK 4: SECURITY DEFINER functions executable by anon role'
\echo '    Expected: 0 rows'
\echo ''

SELECT
  n.nspname AS schema,
  p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND has_function_privilege('anon', p.oid, 'EXECUTE');

-- =============================================================================
-- CHECK 5: Verify authenticated role cannot execute SECURITY DEFINER functions
-- =============================================================================

\echo ''
\echo '>>> CHECK 5: SECURITY DEFINER functions executable by authenticated role'
\echo '    Expected: 0 rows'
\echo ''

SELECT
  n.nspname AS schema,
  p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND has_function_privilege('authenticated', p.oid, 'EXECUTE');

-- =============================================================================
-- SUMMARY
-- =============================================================================

\echo ''
\echo '==========================================================================='
\echo 'SECURITY CHECK COMPLETE'
\echo ''
\echo 'If any checks failed:'
\echo '  - Checks 1/4/5 failed: Run migrations/002_lock_down_security_definer.sql'
\echo '  - Check 3 failed: Enable RLS on the listed tables'
\echo '==========================================================================='
\echo ''
