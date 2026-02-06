-- Run in Supabase SQL Editor to add file metadata columns to app.documents (for existing projects).
-- Run once; if columns already exist, you'll get "column already exists" (safe to ignore).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'app' AND table_name = 'documents' AND column_name = 'file_name') THEN
    ALTER TABLE app.documents ADD COLUMN file_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'app' AND table_name = 'documents' AND column_name = 'file_size_bytes') THEN
    ALTER TABLE app.documents ADD COLUMN file_size_bytes BIGINT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'app' AND table_name = 'documents' AND column_name = 'file_type') THEN
    ALTER TABLE app.documents ADD COLUMN file_type TEXT;
  END IF;
END $$;
