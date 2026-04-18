-- Migration 017: Remove anon insert policies on citizen_feedback and page_views
-- These tables are now written through server API routes using the service role client.
-- Anon insert was a security risk — bots could spam the DB directly.

-- Remove anon insert on citizen_feedback
DROP POLICY IF EXISTS "Allow anonymous feedback inserts" ON citizen_feedback;

-- Remove anon insert on page_views
DROP POLICY IF EXISTS "Allow anonymous page view inserts" ON page_views;

-- Keep the anon SELECT policy on page_views if admin analytics needs it from the client
-- (admin pages use the anon client too, but they could be moved to service role later)

-- Add a note: writes now go through /api/feedback and /api/pageview routes
-- which use supabaseAdmin (service role) to bypass RLS.
