-- One-off: insert missing task_notification rows for existing task_mentions.
-- Run in Supabase SQL Editor (as postgres) so RLS doesn't block the insert.
-- After this, the bell will show past @mentions that never got a notification row.

INSERT INTO app.task_notifications (user_id, task_id, type, comment_id, actor_id, created_at)
SELECT
  tm.mentioned_user_id,
  tm.task_id,
  'mentioned'::app.task_notification_type,
  tm.comment_id,
  tm.mentioned_by,
  COALESCE(tc.created_at, now())
FROM app.task_mentions tm
LEFT JOIN app.task_comments tc ON tc.id = tm.comment_id
WHERE NOT EXISTS (
  SELECT 1 FROM app.task_notifications tn
  WHERE tn.comment_id = tm.comment_id
    AND tn.user_id = tm.mentioned_user_id
    AND tn.type = 'mentioned'
);
