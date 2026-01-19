-- ============================================================================
-- MIGRATION 005: Clean HTML-encoded data
-- ============================================================================
-- This fixes data that was incorrectly HTML-encoded at ingestion.
-- After running this, department names like "AT&amp;T" become "AT&T".
--
-- SAFE TO RUN MULTIPLE TIMES - only updates rows that need it.
-- ============================================================================

-- Clean budgets.department_name
UPDATE budgets
SET department_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  department_name,
  '&amp;', '&'),
  '&lt;', '<'),
  '&gt;', '>'),
  '&quot;', '"'),
  '&#39;', '''')
WHERE department_name LIKE '%&amp;%'
   OR department_name LIKE '%&lt;%'
   OR department_name LIKE '%&gt;%'
   OR department_name LIKE '%&quot;%'
   OR department_name LIKE '%&#39;%';

-- Clean budgets.fund_name
UPDATE budgets
SET fund_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  fund_name,
  '&amp;', '&'),
  '&lt;', '<'),
  '&gt;', '>'),
  '&quot;', '"'),
  '&#39;', '''')
WHERE fund_name LIKE '%&amp;%'
   OR fund_name LIKE '%&lt;%'
   OR fund_name LIKE '%&gt;%'
   OR fund_name LIKE '%&quot;%'
   OR fund_name LIKE '%&#39;%';

-- Clean actuals.department_name
UPDATE actuals
SET department_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  department_name,
  '&amp;', '&'),
  '&lt;', '<'),
  '&gt;', '>'),
  '&quot;', '"'),
  '&#39;', '''')
WHERE department_name LIKE '%&amp;%'
   OR department_name LIKE '%&lt;%'
   OR department_name LIKE '%&gt;%'
   OR department_name LIKE '%&quot;%'
   OR department_name LIKE '%&#39;%';

-- Clean actuals.fund_name
UPDATE actuals
SET fund_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  fund_name,
  '&amp;', '&'),
  '&lt;', '<'),
  '&gt;', '>'),
  '&quot;', '"'),
  '&#39;', '''')
WHERE fund_name LIKE '%&amp;%'
   OR fund_name LIKE '%&lt;%'
   OR fund_name LIKE '%&gt;%'
   OR fund_name LIKE '%&quot;%'
   OR fund_name LIKE '%&#39;%';

-- Clean transactions.department_name
UPDATE transactions
SET department_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  department_name,
  '&amp;', '&'),
  '&lt;', '<'),
  '&gt;', '>'),
  '&quot;', '"'),
  '&#39;', '''')
WHERE department_name LIKE '%&amp;%'
   OR department_name LIKE '%&lt;%'
   OR department_name LIKE '%&gt;%'
   OR department_name LIKE '%&quot;%'
   OR department_name LIKE '%&#39;%';

-- Clean transactions.vendor
UPDATE transactions
SET vendor = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  vendor,
  '&amp;', '&'),
  '&lt;', '<'),
  '&gt;', '>'),
  '&quot;', '"'),
  '&#39;', '''')
WHERE vendor LIKE '%&amp;%'
   OR vendor LIKE '%&lt;%'
   OR vendor LIKE '%&gt;%'
   OR vendor LIKE '%&quot;%'
   OR vendor LIKE '%&#39;%';

-- Clean transactions.description
UPDATE transactions
SET description = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  description,
  '&amp;', '&'),
  '&lt;', '<'),
  '&gt;', '>'),
  '&quot;', '"'),
  '&#39;', '''')
WHERE description LIKE '%&amp;%'
   OR description LIKE '%&lt;%'
   OR description LIKE '%&gt;%'
   OR description LIKE '%&quot;%'
   OR description LIKE '%&#39;%';

-- Clean revenues.department_name
UPDATE revenues
SET department_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  department_name,
  '&amp;', '&'),
  '&lt;', '<'),
  '&gt;', '>'),
  '&quot;', '"'),
  '&#39;', '''')
WHERE department_name LIKE '%&amp;%'
   OR department_name LIKE '%&lt;%'
   OR department_name LIKE '%&gt;%'
   OR department_name LIKE '%&quot;%'
   OR department_name LIKE '%&#39;%';

-- Clean rollup tables
UPDATE budget_actuals_year_department
SET department_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  department_name,
  '&amp;', '&'),
  '&lt;', '<'),
  '&gt;', '>'),
  '&quot;', '"'),
  '&#39;', '''')
WHERE department_name LIKE '%&amp;%'
   OR department_name LIKE '%&lt;%'
   OR department_name LIKE '%&gt;%'
   OR department_name LIKE '%&quot;%'
   OR department_name LIKE '%&#39;%';

UPDATE transaction_year_department
SET department_name = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  department_name,
  '&amp;', '&'),
  '&lt;', '<'),
  '&gt;', '>'),
  '&quot;', '"'),
  '&#39;', '''')
WHERE department_name LIKE '%&amp;%'
   OR department_name LIKE '%&lt;%'
   OR department_name LIKE '%&gt;%'
   OR department_name LIKE '%&quot;%'
   OR department_name LIKE '%&#39;%';

UPDATE transaction_year_vendor
SET vendor = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  vendor,
  '&amp;', '&'),
  '&lt;', '<'),
  '&gt;', '>'),
  '&quot;', '"'),
  '&#39;', '''')
WHERE vendor LIKE '%&amp;%'
   OR vendor LIKE '%&lt;%'
   OR vendor LIKE '%&gt;%'
   OR vendor LIKE '%&quot;%'
   OR vendor LIKE '%&#39;%';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to check if any encoded entities remain:
--
-- SELECT DISTINCT department_name FROM budgets WHERE department_name LIKE '%&amp;%';
-- SELECT DISTINCT vendor FROM transactions WHERE vendor LIKE '%&amp;%';
--
-- Expected: 0 rows
-- ============================================================================
