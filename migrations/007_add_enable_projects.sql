-- ============================================================================
-- MIGRATION 007: Add enable_projects column to portal_settings
-- ============================================================================
--
-- Adds the enable_projects flag to control visibility of the Projects
-- section in the public portal navigation.
--
-- Run on ALL existing customer databases.
-- ============================================================================

ALTER TABLE portal_settings 
ADD COLUMN IF NOT EXISTS enable_projects BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check the column exists:
--   SELECT enable_projects FROM portal_settings WHERE id = 1;
-- ============================================================================
