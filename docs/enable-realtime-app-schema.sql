-- Enable Realtime for app schema tables (notifications).
-- Run this in Supabase SQL Editor after the tables exist. Safe to run multiple times.
-- The Replication UI (Database → Replication) only lists public schema tables;
-- app schema tables must be added to the publication via this SQL.

-- Add only if not already in the publication (safe to run again)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'app' AND tablename = 'company_notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app.company_notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'app' AND tablename = 'task_notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app.task_notifications;
  END IF;
END $$;
