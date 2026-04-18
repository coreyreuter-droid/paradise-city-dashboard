-- Migration 018: Budget document link, methodology fields, analytics view
-- Supports: budget PDF link, city-specific methodology, server-side analytics aggregation

-- 1. Budget document URL — configurable link to official budget PDF
ALTER TABLE portal_settings
ADD COLUMN IF NOT EXISTS budget_document_url TEXT;

-- 2. Methodology fields — city-specific data descriptions for About page
ALTER TABLE portal_settings
ADD COLUMN IF NOT EXISTS methodology_data_source TEXT,
ADD COLUMN IF NOT EXISTS methodology_accounting_basis TEXT,
ADD COLUMN IF NOT EXISTS methodology_update_schedule TEXT,
ADD COLUMN IF NOT EXISTS methodology_exclusions TEXT,
ADD COLUMN IF NOT EXISTS methodology_audit_status TEXT;

-- 3. Feedback notification email — where to send email when feedback is submitted
ALTER TABLE portal_settings
ADD COLUMN IF NOT EXISTS feedback_notification_email TEXT;

-- 4. Aggregated page views view — server-side analytics
CREATE OR REPLACE VIEW v_page_views_daily AS
SELECT
  date_trunc('day', created_at) AS view_date,
  page_path,
  COUNT(*) AS view_count,
  COUNT(DISTINCT session_id) AS unique_sessions
FROM page_views
GROUP BY date_trunc('day', created_at), page_path
ORDER BY view_date DESC, view_count DESC;

-- 5. Summary view for admin analytics dashboard
CREATE OR REPLACE VIEW v_page_views_summary AS
SELECT
  page_path,
  COUNT(*) AS total_views,
  COUNT(DISTINCT session_id) AS unique_sessions,
  MAX(created_at) AS last_viewed_at
FROM page_views
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY page_path
ORDER BY total_views DESC;
