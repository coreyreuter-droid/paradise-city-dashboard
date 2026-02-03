-- =============================================================================
-- Migration 012: Add original_headers to mapping_profiles
-- =============================================================================
-- Stores the original CSV header order for position-based matching
-- Run this BEFORE deploying the new code
-- =============================================================================

-- Add the column
ALTER TABLE mapping_profiles 
ADD COLUMN IF NOT EXISTS original_headers text[] DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN mapping_profiles.original_headers IS 
  'Original CSV headers in order. Used for position-based matching. e.g. ARRAY[''FY'', ''Fund'', ''Dept'', ''Amount'']';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'mapping_profiles' 
  AND column_name = 'original_headers';
