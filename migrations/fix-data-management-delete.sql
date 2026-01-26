-- Migration: Fix Data Management Delete
-- Run this in Supabase SQL Editor if the Data Management page shows errors loading fiscal years

-- Function: get_fiscal_years_for_table
-- Returns distinct fiscal years for a given table (budgets, actuals, transactions, revenues)
CREATE OR REPLACE FUNCTION public.get_fiscal_years_for_table(_table TEXT)
RETURNS TABLE(fiscal_year INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Require admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'admin required';
  END IF;

  -- Restrict to allowed tables
  IF _table NOT IN ('budgets', 'actuals', 'transactions', 'revenues') THEN
    RAISE EXCEPTION 'invalid table';
  END IF;

  -- Return distinct fiscal years, newest first
  RETURN QUERY EXECUTE format(
    'SELECT DISTINCT fiscal_year::int
     FROM public.%I
     WHERE fiscal_year IS NOT NULL
     ORDER BY fiscal_year DESC',
    _table
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_fiscal_years_for_table(TEXT) TO authenticated;
