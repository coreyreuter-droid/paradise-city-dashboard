-- ============================================================================
-- MIGRATION 003: Search Counts RPC
-- ============================================================================
--
-- Moves distinct counting from JavaScript to the database for better performance.
-- Instead of fetching all rows and deduplicating in JS, we use COUNT(DISTINCT).
--
-- ============================================================================

-- Function to count unique departments matching a search pattern
CREATE OR REPLACE FUNCTION search_count_departments(
  _pattern text,
  _fiscal_year integer DEFAULT NULL
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COUNT(DISTINCT LOWER(department_name))::integer
  FROM budget_actuals_year_department
  WHERE department_name ILIKE _pattern
    AND (_fiscal_year IS NULL OR fiscal_year = _fiscal_year);
$$;

-- Function to count unique vendors matching a search pattern
CREATE OR REPLACE FUNCTION search_count_vendors(
  _pattern text,
  _fiscal_year integer DEFAULT NULL
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COUNT(DISTINCT LOWER(vendor))::integer
  FROM transaction_year_vendor
  WHERE vendor ILIKE _pattern
    AND (_fiscal_year IS NULL OR fiscal_year = _fiscal_year);
$$;

-- Grant execute to anon (needed for public search)
GRANT EXECUTE ON FUNCTION search_count_departments(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION search_count_vendors(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION search_count_departments(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION search_count_vendors(text, integer) TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Test with:
--   SELECT search_count_departments('%police%', NULL);
--   SELECT search_count_vendors('%acme%', 2024);
-- ============================================================================
