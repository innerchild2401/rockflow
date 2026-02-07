-- Task notifications (mentions, comments, etc.) and task watchers. Run in Supabase SQL Editor if mentions/notifications don't show.
-- After running, also run docs/enable-realtime-app-schema.sql so new notifications appear live.

SET search_path = app, public;

-- Watchers: who is watching a task (they get notifications for comments, status changes, etc.)
CREATE TABLE IF NOT EXISTS app.task_watchers (
  task_id UUID NOT NULL REFERENCES app.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_task_watchers_task ON app.task_watchers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_watchers_user ON app.task_watchers(user_id);

-- Notifications: one row per user per event (mention, comment, document added, etc.)
CREATE TABLE IF NOT EXISTS app.task_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app.profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES app.tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mentioned', 'assigned', 'commented', 'status_changed', 'document_added', 'due_date_changed')),
  comment_id UUID REFERENCES app.task_comments(id) ON DELETE SET NULL,
  document_id UUID REFERENCES app.documents(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES app.profiles(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_notifications_user ON app.task_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_task ON app.task_notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_created ON app.task_notifications(created_at DESC);

ALTER TABLE app.task_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.task_notifications ENABLE ROW LEVEL SECURITY;

-- Watchers: members can read watchers for tasks in their company; only editors can insert/delete (watch/unwatch)
CREATE POLICY task_watchers_select ON app.task_watchers FOR SELECT USING (
  app.is_company_member((SELECT company_id FROM app.tasks WHERE id = task_id))
);
CREATE POLICY task_watchers_insert ON app.task_watchers FOR INSERT WITH CHECK (
  app.can_edit_tasks((SELECT company_id FROM app.tasks WHERE id = task_id)) AND user_id = app.current_user_id()
);
CREATE POLICY task_watchers_delete ON app.task_watchers FOR DELETE USING (
  app.can_edit_tasks((SELECT company_id FROM app.tasks WHERE id = task_id)) AND user_id = app.current_user_id()
);

-- Notifications: user can only read/update their own
CREATE POLICY task_notifications_select ON app.task_notifications FOR SELECT USING (user_id = app.current_user_id());
CREATE POLICY task_notifications_update ON app.task_notifications FOR UPDATE USING (user_id = app.current_user_id());
-- Insert is done from server when creating comments/mentions (service role or allow company members to insert for their tasks)
CREATE POLICY task_notifications_insert ON app.task_notifications FOR INSERT WITH CHECK (
  app.is_company_member((SELECT company_id FROM app.tasks WHERE id = task_id))
);
