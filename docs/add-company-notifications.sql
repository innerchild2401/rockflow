-- Company-level notifications (e.g. new member joined). Run in Supabase SQL Editor.
-- Enables "notify admin to review permissions" when a new member joins.
-- For live updates: run docs/enable-realtime-app-schema.sql in SQL Editor (Replication UI only shows public schema).

SET search_path = app, public;

CREATE TYPE app.company_notification_type AS ENUM ('member_joined');

CREATE TABLE app.company_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES app.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app.profiles(id) ON DELETE CASCADE,
  type app.company_notification_type NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_company_notifications_user ON app.company_notifications(user_id);
CREATE INDEX idx_company_notifications_company ON app.company_notifications(company_id);
CREATE INDEX idx_company_notifications_created ON app.company_notifications(created_at DESC);

ALTER TABLE app.company_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_notifications_select_own ON app.company_notifications
  FOR SELECT USING (user_id = app.current_user_id());

CREATE POLICY company_notifications_update_own ON app.company_notifications
  FOR UPDATE USING (user_id = app.current_user_id());

-- Insert is done from server with service role when new member joins (no INSERT policy = only service role can insert)
