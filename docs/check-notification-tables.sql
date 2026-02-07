-- Run in Supabase SQL Editor to check if notification tables exist in app schema.

SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'app'
  AND table_name IN ('task_notifications', 'task_watchers', 'company_notifications')
ORDER BY table_name;
