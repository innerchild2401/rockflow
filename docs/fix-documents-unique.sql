-- Run in Supabase SQL Editor if you already have app.folders and app.documents
-- and want to enforce unique folder name per parent and unique document title per folder.
-- Step 1: Rename existing duplicates so the unique index can be created.

-- Folders: keep first per (company, parent, name); rename others to "Name (2)", "Name (3)", etc.
WITH folder_dupes AS (
  SELECT id, name,
    ROW_NUMBER() OVER (
      PARTITION BY company_id, COALESCE(parent_folder_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(TRIM(name))
      ORDER BY created_at, id
    ) AS rn
  FROM app.folders
)
UPDATE app.folders f
SET name = f.name || ' (' || fd.rn || ')'
FROM folder_dupes fd
WHERE f.id = fd.id AND fd.rn > 1;

-- Documents: same for (company, folder, title)
WITH doc_dupes AS (
  SELECT id, title,
    ROW_NUMBER() OVER (
      PARTITION BY company_id, COALESCE(folder_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(TRIM(title))
      ORDER BY updated_at, id
    ) AS rn
  FROM app.documents
)
UPDATE app.documents d
SET title = d.title || ' (' || dd.rn || ')'
FROM doc_dupes dd
WHERE d.id = dd.id AND dd.rn > 1;

-- Step 2: Create unique indexes
DROP INDEX IF EXISTS app.idx_folders_name_per_parent;
DROP INDEX IF EXISTS app.idx_documents_title_per_folder;

CREATE UNIQUE INDEX idx_folders_name_per_parent ON app.folders (company_id, COALESCE(parent_folder_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(TRIM(name)));
CREATE UNIQUE INDEX idx_documents_title_per_folder ON app.documents (company_id, COALESCE(folder_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(TRIM(title)));
