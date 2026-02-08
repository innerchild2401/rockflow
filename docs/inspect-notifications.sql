-- Inspect notifications and related data (run in Supabase SQL Editor as postgres; RLS does not apply).
-- Use this to see if rows exist that should have appeared in the app (e.g. user_id vs auth.uid() mismatch).

SET search_path = app, public;

-- 1) Task notifications: who they're for, which task, type, who did it, when
SELECT
  tn.id,
  tn.user_id AS recipient_user_id,
  p_to.display_name AS recipient_name,
  p_to.email AS recipient_email,
  t.title AS task_title,
  tn.type,
  tn.actor_id,
  p_actor.display_name AS actor_name,
  tn.read_at IS NOT NULL AS read,
  tn.created_at
FROM app.task_notifications tn
LEFT JOIN app.profiles p_to ON p_to.id = tn.user_id
LEFT JOIN app.profiles p_actor ON p_actor.id = tn.actor_id
LEFT JOIN app.tasks t ON t.id = tn.task_id
ORDER BY tn.created_at DESC
LIMIT 50;

-- 2) Company notifications: who they're for, which company, type, when
SELECT
  cn.id,
  cn.user_id AS recipient_user_id,
  p_to.display_name AS recipient_name,
  p_to.email AS recipient_email,
  c.name AS company_name,
  cn.type,
  cn.read_at IS NOT NULL AS read,
  cn.created_at
FROM app.company_notifications cn
LEFT JOIN app.profiles p_to ON p_to.id = cn.user_id
LEFT JOIN app.companies c ON c.id = cn.company_id
ORDER BY cn.created_at DESC
LIMIT 50;

-- 3) Task mentions: who was mentioned, by whom, which comment/task (to confirm mentions were recorded)
SELECT
  tm.task_id,
  t.title AS task_title,
  tm.comment_id,
  tm.mentioned_user_id,
  p_mentioned.display_name AS mentioned_name,
  p_mentioned.email AS mentioned_email,
  tm.mentioned_by,
  p_by.display_name AS mentioned_by_name,
  tc.created_at AS comment_at
FROM app.task_mentions tm
LEFT JOIN app.profiles p_mentioned ON p_mentioned.id = tm.mentioned_user_id
LEFT JOIN app.profiles p_by ON p_by.id = tm.mentioned_by
LEFT JOIN app.task_comments tc ON tc.id = tm.comment_id
LEFT JOIN app.tasks t ON t.id = tm.task_id
ORDER BY tc.created_at DESC
LIMIT 50;

-- 4) Quick counts (tables exist and row counts)
SELECT 'task_notifications' AS tbl, COUNT(*) AS cnt FROM app.task_notifications
UNION ALL
SELECT 'company_notifications', COUNT(*) FROM app.company_notifications
UNION ALL
SELECT 'task_mentions', COUNT(*) FROM app.task_mentions;

-- 5) Recap-related: audit_logs and company_recaps (for "Past hour" social recap)
SELECT 'audit_logs' AS tbl, COUNT(*) AS cnt FROM app.audit_logs
UNION ALL
SELECT 'company_recaps', COUNT(*) FROM app.company_recaps;

-- Recent audit_logs (recap uses these for "past hour" events)
SELECT id, company_id, user_id, action, entity_type, entity_id, created_at
FROM app.audit_logs
ORDER BY created_at DESC
LIMIT 20;
