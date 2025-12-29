-- migrations/001_rate_limits.sql
-- Required for production rate limiting across serverless instances
-- Run this in your Supabase SQL editor

-- Create rate_limits table for tracking API request counts
CREATE TABLE IF NOT EXISTS rate_limits (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups by key and time window
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created 
ON rate_limits(key, created_at);

-- Optional: Add RLS policy to prevent direct access from client
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role only" ON rate_limits
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Clean up old entries daily (optional - scheduled job)
-- You can set this up as a Supabase cron job:
-- DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '24 hours';
