-- Run in Supabase SQL Editor to add reactions/emojis to task comments.
-- Safe to run multiple times (uses DO blocks to check existence).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'app' AND table_name = 'task_comment_reactions') THEN
    CREATE TABLE app.task_comment_reactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      comment_id UUID NOT NULL REFERENCES app.task_comments(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES app.profiles(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL, -- Emoji character or shortcode (e.g., '👍', 'heart', 'laugh')
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(comment_id, user_id, emoji)
    );
    CREATE INDEX idx_task_comment_reactions_comment ON app.task_comment_reactions(comment_id);
    CREATE INDEX idx_task_comment_reactions_user ON app.task_comment_reactions(user_id);
  END IF;
END $$;

-- RLS policies
ALTER TABLE app.task_comment_reactions ENABLE ROW LEVEL SECURITY;

-- Members can read reactions; can edit tasks can react
CREATE POLICY task_comment_reactions_select ON app.task_comment_reactions
  FOR SELECT USING (
    app.is_company_member((SELECT company_id FROM app.tasks WHERE id = (SELECT task_id FROM app.task_comments WHERE id = comment_id)))
  );
CREATE POLICY task_comment_reactions_insert ON app.task_comment_reactions
  FOR INSERT WITH CHECK (
    app.can_edit_tasks((SELECT company_id FROM app.tasks WHERE id = (SELECT task_id FROM app.task_comments WHERE id = comment_id)))
  );
CREATE POLICY task_comment_reactions_delete ON app.task_comment_reactions
  FOR DELETE USING (user_id = app.current_user_id());
