-- ============================================================================
-- MIGRATION 002: Lock Down SECURITY DEFINER Functions
-- ============================================================================
--
-- CRITICAL SECURITY FIX
--
-- Problem: Functions marked SECURITY DEFINER run with owner privileges.
-- By default, Postgres grants EXECUTE to PUBLIC on all functions.
-- This means anonymous Supabase users could call these RPCs and:
--   - DELETE rollup data
--   - INSERT manipulated summaries
--   - Cause expensive recomputation
--
-- Solution: Dynamically revoke EXECUTE from PUBLIC, anon, and authenticated
-- roles on ALL SECURITY DEFINER functions in the public schema.
--
-- This approach is DRIFT-PROOF: it catches any SECURITY DEFINER function,
-- including ones added in the future.
--
-- Run on ALL existing customer databases.
-- ============================================================================

DO $$
DECLARE
  r record;
  revoke_count integer := 0;
BEGIN
  RAISE NOTICE 'Scanning for SECURITY DEFINER functions in public schema...';

  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS func_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    -- Revoke from PUBLIC
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC;',
      r.schema_name, r.func_name, r.args
    );

    -- Revoke from anon (Supabase anonymous role)
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon;',
      r.schema_name, r.func_name, r.args
    );

    -- Revoke from authenticated (Supabase logged-in user role)
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM authenticated;',
      r.schema_name, r.func_name, r.args
    );

    revoke_count := revoke_count + 1;
    RAISE NOTICE 'Locked down: %.%(%)', r.schema_name, r.func_name, r.args;
  END LOOP;

  RAISE NOTICE 'Complete. Locked down % SECURITY DEFINER function(s).', revoke_count;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running, execute scripts/security-check.sql to verify.
-- All checks should return 0 rows.
-- ============================================================================
