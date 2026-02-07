-- Run in Supabase SQL Editor to check RLS policies on notification tables.

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'app'
  AND tablename IN ('task_notifications', 'company_notifications')
ORDER BY tablename, policyname;
