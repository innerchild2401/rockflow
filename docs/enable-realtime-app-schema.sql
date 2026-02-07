-- Enable Realtime for app schema tables (notifications).
-- Run this in Supabase SQL Editor after the tables exist.
-- The Replication UI (Database → Replication) only lists public schema tables;
-- app schema tables must be added to the publication via this SQL.

-- Add app schema notification tables to the Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE app.company_notifications;
-- If task_notifications exists in app schema (for task mentions/comments etc.), add it:
ALTER PUBLICATION supabase_realtime ADD TABLE app.task_notifications;
