-- Company feed: team-wide chat (what you're working on, ask for help, etc.)
-- Company recaps: cache for hourly AI-generated recap (company_id + hour bucket)

SET search_path = app, public;

-- Team feed (company-wide posts)
CREATE TABLE IF NOT EXISTS app.company_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES app.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app.profiles(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_feed_company ON app.company_feed(company_id);
CREATE INDEX IF NOT EXISTS idx_company_feed_created ON app.company_feed(company_id, created_at DESC);

ALTER TABLE app.company_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_feed_select ON app.company_feed;
DROP POLICY IF EXISTS company_feed_insert ON app.company_feed;
CREATE POLICY company_feed_select ON app.company_feed
  FOR SELECT USING (app.is_company_member(company_id));
CREATE POLICY company_feed_insert ON app.company_feed
  FOR INSERT WITH CHECK (app.is_company_member(company_id));

-- Recap cache (one row per company per hour; content = AI-generated report)
CREATE TABLE IF NOT EXISTS app.company_recaps (
  company_id UUID NOT NULL REFERENCES app.companies(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_company_recaps_period ON app.company_recaps(company_id, period_start DESC);

ALTER TABLE app.company_recaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_recaps_select ON app.company_recaps;
DROP POLICY IF EXISTS company_recaps_insert ON app.company_recaps;
DROP POLICY IF EXISTS company_recaps_update ON app.company_recaps;
CREATE POLICY company_recaps_select ON app.company_recaps
  FOR SELECT USING (app.is_company_member(company_id));
CREATE POLICY company_recaps_insert ON app.company_recaps
  FOR INSERT WITH CHECK (app.is_company_member(company_id));
CREATE POLICY company_recaps_update ON app.company_recaps
  FOR UPDATE USING (app.is_company_member(company_id));
