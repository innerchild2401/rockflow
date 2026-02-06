-- Run in Supabase SQL Editor to add Google Calendar sync functionality.
-- Safe to run multiple times (uses DO blocks to check existence).

-- Google Calendar sync settings per company
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'app' AND table_name = 'google_calendar_sync') THEN
    CREATE TABLE app.google_calendar_sync (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      company_id UUID NOT NULL REFERENCES app.companies(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES app.profiles(id) ON DELETE CASCADE,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      token_expires_at TIMESTAMPTZ NOT NULL,
      calendar_id TEXT, -- Google Calendar ID (primary calendar if null)
      sync_enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(company_id, user_id)
    );
    CREATE INDEX idx_google_calendar_sync_company ON app.google_calendar_sync(company_id);
    CREATE INDEX idx_google_calendar_sync_user ON app.google_calendar_sync(user_id);
  END IF;
END $$;

-- Task to Google Calendar event mapping
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'app' AND table_name = 'task_calendar_events') THEN
    CREATE TABLE app.task_calendar_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      task_id UUID NOT NULL REFERENCES app.tasks(id) ON DELETE CASCADE,
      sync_id UUID NOT NULL REFERENCES app.google_calendar_sync(id) ON DELETE CASCADE,
      google_event_id TEXT NOT NULL, -- Google Calendar event ID
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(task_id, sync_id)
    );
    CREATE INDEX idx_task_calendar_events_task ON app.task_calendar_events(task_id);
    CREATE INDEX idx_task_calendar_events_sync ON app.task_calendar_events(sync_id);
    CREATE INDEX idx_task_calendar_events_google_id ON app.task_calendar_events(google_event_id);
  END IF;
END $$;

-- RLS policies
ALTER TABLE app.google_calendar_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.task_calendar_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS google_calendar_sync_select ON app.google_calendar_sync;
DROP POLICY IF EXISTS google_calendar_sync_insert ON app.google_calendar_sync;
DROP POLICY IF EXISTS google_calendar_sync_update ON app.google_calendar_sync;
DROP POLICY IF EXISTS google_calendar_sync_delete ON app.google_calendar_sync;
DROP POLICY IF EXISTS task_calendar_events_select ON app.task_calendar_events;
DROP POLICY IF EXISTS task_calendar_events_insert ON app.task_calendar_events;
DROP POLICY IF EXISTS task_calendar_events_update ON app.task_calendar_events;
DROP POLICY IF EXISTS task_calendar_events_delete ON app.task_calendar_events;

-- Users can read their own sync settings
CREATE POLICY google_calendar_sync_select ON app.google_calendar_sync
  FOR SELECT USING (user_id = app.current_user_id());
CREATE POLICY google_calendar_sync_insert ON app.google_calendar_sync
  FOR INSERT WITH CHECK (user_id = app.current_user_id());
CREATE POLICY google_calendar_sync_update ON app.google_calendar_sync
  FOR UPDATE USING (user_id = app.current_user_id());
CREATE POLICY google_calendar_sync_delete ON app.google_calendar_sync
  FOR DELETE USING (user_id = app.current_user_id());

-- Members can read calendar events for their company's tasks
CREATE POLICY task_calendar_events_select ON app.task_calendar_events
  FOR SELECT USING (
    app.is_company_member((SELECT company_id FROM app.tasks WHERE id = task_id))
  );
CREATE POLICY task_calendar_events_insert ON app.task_calendar_events
  FOR INSERT WITH CHECK (
    app.is_company_member((SELECT company_id FROM app.tasks WHERE id = task_id))
  );
CREATE POLICY task_calendar_events_update ON app.task_calendar_events
  FOR UPDATE USING (
    app.is_company_member((SELECT company_id FROM app.tasks WHERE id = task_id))
  );
CREATE POLICY task_calendar_events_delete ON app.task_calendar_events
  FOR DELETE USING (
    app.is_company_member((SELECT company_id FROM app.tasks WHERE id = task_id))
  );
