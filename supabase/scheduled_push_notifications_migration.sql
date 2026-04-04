-- Migration: Scheduled Push Notifications Table
-- Created: 2026-04-04

-- Table to store scheduled push notifications
CREATE TABLE IF NOT EXISTS scheduled_push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'all',
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_scheduled_push_sent ON scheduled_push_notifications(sent);
CREATE INDEX IF NOT EXISTS idx_scheduled_push_scheduled_for ON scheduled_push_notifications(scheduled_for);

-- Enable Row Level Security
ALTER TABLE scheduled_push_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage scheduled push notifications"
  ON scheduled_push_notifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = TRUE
    )
  );

-- Policy: Authenticated users can view their own created notifications
CREATE POLICY "Users can view their own scheduled notifications"
  ON scheduled_push_notifications
  FOR SELECT
  USING (
    created_by = auth.uid()
  );

-- Policy: Authenticated users can insert their own notifications
CREATE POLICY "Users can insert their own scheduled notifications"
  ON scheduled_push_notifications
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
  );

--
-- SQL Summary:
--
-- This migration creates:
--
-- 1. Table: scheduled_push_notifications
--    - id: UUID primary key (auto-generated)
--    - title: Notification title (required)
--    - body: Notification body text (required)
--    - segment: Target segment, default 'all' (required)
--    - scheduled_for: Timestamp when notification should be sent (required)
--    - sent: Boolean flag indicating if sent (default FALSE)
--    - sent_at: Timestamp when actually sent (optional)
--    - created_by: Foreign key to auth.users (optional, set NULL on user delete)
--    - created_at: Timestamp of creation (default NOW())
--
-- 2. Indexes:
--    - idx_scheduled_push_sent: Index on 'sent' for querying pending notifications
--    - idx_scheduled_push_scheduled_for: Index on 'scheduled_for' for time-based queries
--
-- 3. RLS Policies:
--    - Admins (is_admin=true in app_metadata) have full CRUD access
--    - Authenticated users can SELECT and INSERT only their own records
--    - Regular users cannot UPDATE or DELETE scheduled notifications
--
-- To run this migration in Supabase:
--   1. Go to Supabase Dashboard > SQL Editor
--   2. Paste this entire file content
--   3. Click "Run"
--
-- To check if it worked:
--   SELECT * FROM scheduled_push_notifications LIMIT 1;
--   SELECT * FROM pg_policies WHERE tablename = 'scheduled_push_notifications';
--
