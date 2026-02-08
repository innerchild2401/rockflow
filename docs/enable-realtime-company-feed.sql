-- Enable Realtime for app.company_feed so new posts appear without refresh.
-- Run in Supabase SQL Editor. Safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'app' AND tablename = 'company_feed') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app.company_feed;
  END IF;
END $$;
