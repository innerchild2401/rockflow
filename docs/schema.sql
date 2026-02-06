-- =============================================================================
-- Multi-Tenant Knowledge & Operations Platform — Full Schema
-- Run this in Supabase SQL Editor. Do not run migrations from code.
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Schema (must exist before types/tables)
CREATE SCHEMA IF NOT EXISTS app;

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE app.user_role AS ENUM ('employee', 'enterprise_admin');

CREATE TYPE app.company_member_role AS ENUM ('admin', 'member');

CREATE TYPE app.permission_type AS ENUM (
  'read',
  'edit',
  'create',
  'delete',
  'manage_folders',
  'manage_documents',
  'manage_tasks',
  'manage_members'
);

CREATE TYPE app.task_status AS ENUM ('todo', 'in_progress', 'done', 'cancelled');

CREATE TYPE app.audit_action AS ENUM ('created', 'updated', 'deleted');

CREATE TYPE app.audit_entity_type AS ENUM (
  'company',
  'folder',
  'document',
  'task',
  'comment',
  'member',
  'permission',
  'invite'
);

-- =============================================================================
-- TABLES
-- =============================================================================

-- Profiles (1:1 with auth.users)
CREATE TABLE app.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role app.user_role NOT NULL DEFAULT 'employee',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Companies
CREATE TABLE app.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES app.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_companies_slug ON app.companies(slug);

-- Company members (user ↔ company; multi-tenant)
CREATE TABLE app.company_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES app.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app.profiles(id) ON DELETE CASCADE,
  role app.company_member_role NOT NULL DEFAULT 'member',
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX idx_company_members_company ON app.company_members(company_id);
CREATE INDEX idx_company_members_user ON app.company_members(user_id);

-- Per-user per-company permissions (only for role = 'member'; admins have all)
CREATE TABLE app.company_member_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES app.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app.profiles(id) ON DELETE CASCADE,
  permission app.permission_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id, permission),
  FOREIGN KEY (company_id, user_id) REFERENCES app.company_members(company_id, user_id) ON DELETE CASCADE
);

CREATE INDEX idx_company_member_permissions_lookup ON app.company_member_permissions(company_id, user_id);

-- Invites (invited users don't need approval; they join on sign-up/link)
CREATE TABLE app.company_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES app.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES app.profiles(id) ON DELETE RESTRICT,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, email)
);

CREATE INDEX idx_company_invites_token ON app.company_invites(token);
CREATE INDEX idx_company_invites_email ON app.company_invites(email);

-- Folders (tree per company)
CREATE TABLE app.folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES app.companies(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES app.folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES app.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_folders_company ON app.folders(company_id);
CREATE INDEX idx_folders_parent ON app.folders(parent_folder_id);
-- One folder name per parent (root = same parent sentinel)
CREATE UNIQUE INDEX idx_folders_name_per_parent ON app.folders (company_id, COALESCE(parent_folder_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(TRIM(name)));

-- Documents (procedures; optional folder; file metadata for uploads)
CREATE TABLE app.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES app.companies(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES app.folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  file_name TEXT,
  file_size_bytes BIGINT,
  file_type TEXT,
  created_by UUID NOT NULL REFERENCES app.profiles(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES app.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_company ON app.documents(company_id);
CREATE INDEX idx_documents_folder ON app.documents(folder_id);
CREATE INDEX idx_documents_updated ON app.documents(company_id, updated_at DESC);
-- One document title per folder per company (root = same folder sentinel)
CREATE UNIQUE INDEX idx_documents_title_per_folder ON app.documents (company_id, COALESCE(folder_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(TRIM(title)));

-- Document chunks for RAG (pgvector)
CREATE TABLE app.document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES app.documents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES app.companies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, chunk_index)
);

CREATE INDEX idx_document_chunks_document ON app.document_chunks(document_id);
CREATE INDEX idx_document_chunks_company ON app.document_chunks(company_id);
-- Vector similarity search (cosine distance). Run after document_chunks has rows with embeddings if this fails on empty table.
CREATE INDEX idx_document_chunks_embedding ON app.document_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Tasks
CREATE TABLE app.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES app.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status app.task_status NOT NULL DEFAULT 'todo',
  due_date DATE,
  assigned_to UUID REFERENCES app.profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES app.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_company ON app.tasks(company_id);
CREATE INDEX idx_tasks_assigned ON app.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON app.tasks(company_id, status);
CREATE INDEX idx_tasks_due ON app.tasks(company_id, due_date);

-- Task comments (threaded)
CREATE TABLE app.task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES app.tasks(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES app.task_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app.profiles(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_comments_task ON app.task_comments(task_id);
CREATE INDEX idx_task_comments_parent ON app.task_comments(parent_comment_id);

-- Audit log (everything important)
CREATE TABLE app.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES app.companies(id) ON DELETE SET NULL,
  user_id UUID REFERENCES app.profiles(id) ON DELETE SET NULL,
  action app.audit_action NOT NULL,
  entity_type app.audit_entity_type NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_company_time ON app.audit_logs(company_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON app.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON app.audit_logs(user_id, created_at DESC);

-- =============================================================================
-- RLS HELPERS (used by policies)
-- =============================================================================

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION app.is_company_member(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.company_members
    WHERE company_id = p_company_id AND user_id = app.current_user_id()
  );
$$;

CREATE OR REPLACE FUNCTION app.is_company_admin(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.company_members
    WHERE company_id = p_company_id AND user_id = app.current_user_id() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION app.has_company_permission(p_company_id UUID, p_permission app.permission_type)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT
    app.is_company_admin(p_company_id)
    OR EXISTS (
      SELECT 1 FROM app.company_member_permissions
      WHERE company_id = p_company_id AND user_id = app.current_user_id() AND permission = p_permission
    );
$$;

-- Admin has all permissions; member needs explicit permission
CREATE OR REPLACE FUNCTION app.can_read_documents(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT app.is_company_admin(p_company_id)
    OR app.has_company_permission(p_company_id, 'read')
    OR app.has_company_permission(p_company_id, 'manage_documents');
$$;

CREATE OR REPLACE FUNCTION app.can_edit_documents(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT app.is_company_admin(p_company_id)
    OR app.has_company_permission(p_company_id, 'edit')
    OR app.has_company_permission(p_company_id, 'manage_documents');
$$;

CREATE OR REPLACE FUNCTION app.can_create_documents(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT app.is_company_admin(p_company_id)
    OR app.has_company_permission(p_company_id, 'create')
    OR app.has_company_permission(p_company_id, 'manage_documents');
$$;

CREATE OR REPLACE FUNCTION app.can_delete_documents(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT app.is_company_admin(p_company_id)
    OR app.has_company_permission(p_company_id, 'delete')
    OR app.has_company_permission(p_company_id, 'manage_documents');
$$;

CREATE OR REPLACE FUNCTION app.can_manage_folders(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT app.is_company_admin(p_company_id)
    OR app.has_company_permission(p_company_id, 'manage_folders');
$$;

CREATE OR REPLACE FUNCTION app.can_read_folders(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT app.is_company_admin(p_company_id)
    OR app.has_company_permission(p_company_id, 'read')
    OR app.has_company_permission(p_company_id, 'manage_folders');
$$;

CREATE OR REPLACE FUNCTION app.can_read_tasks(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT app.is_company_admin(p_company_id)
    OR app.has_company_permission(p_company_id, 'read')
    OR app.has_company_permission(p_company_id, 'manage_tasks');
$$;

CREATE OR REPLACE FUNCTION app.can_edit_tasks(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT app.is_company_admin(p_company_id)
    OR app.has_company_permission(p_company_id, 'edit')
    OR app.has_company_permission(p_company_id, 'manage_tasks');
$$;

CREATE OR REPLACE FUNCTION app.can_create_tasks(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT app.is_company_admin(p_company_id)
    OR app.has_company_permission(p_company_id, 'create')
    OR app.has_company_permission(p_company_id, 'manage_tasks');
$$;

CREATE OR REPLACE FUNCTION app.can_delete_tasks(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT app.is_company_admin(p_company_id)
    OR app.has_company_permission(p_company_id, 'delete')
    OR app.has_company_permission(p_company_id, 'manage_tasks');
$$;

CREATE OR REPLACE FUNCTION app.can_manage_members(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT app.is_company_admin(p_company_id)
    OR app.has_company_permission(p_company_id, 'manage_members');
$$;

-- True when current user created the company (allows adding self as first member)
CREATE OR REPLACE FUNCTION app.is_company_creator(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT created_by = app.current_user_id() FROM app.companies WHERE id = p_company_id;
$$;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE app.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.company_member_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.company_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update own
CREATE POLICY profiles_select_own ON app.profiles
  FOR SELECT USING (id = app.current_user_id());
CREATE POLICY profiles_update_own ON app.profiles
  FOR UPDATE USING (id = app.current_user_id());
CREATE POLICY profiles_insert_own ON app.profiles
  FOR INSERT WITH CHECK (id = app.current_user_id());

-- Companies: members can read; enterprise_admin can insert (create company)
CREATE POLICY companies_select_member ON app.companies
  FOR SELECT USING (app.is_company_member(id));
-- Allow any authenticated user to create a company; app sets created_by = current user
CREATE POLICY companies_insert_admin ON app.companies
  FOR INSERT WITH CHECK (app.current_user_id() IS NOT NULL);
CREATE POLICY companies_update_admin ON app.companies
  FOR UPDATE USING (app.is_company_admin(id));

-- Company members: members can read; only admins can insert/update/delete
CREATE POLICY company_members_select ON app.company_members
  FOR SELECT USING (app.is_company_member(company_id));
-- Admins can add members; company creator can add themselves as first member
CREATE POLICY company_members_insert ON app.company_members
  FOR INSERT WITH CHECK (
    app.can_manage_members(company_id)
    OR (user_id = app.current_user_id() AND app.is_company_creator(company_id))
  );
CREATE POLICY company_members_update ON app.company_members
  FOR UPDATE USING (app.can_manage_members(company_id));
CREATE POLICY company_members_delete ON app.company_members
  FOR DELETE USING (app.can_manage_members(company_id));

-- Permissions: members can read; only admins can modify
CREATE POLICY company_member_permissions_select ON app.company_member_permissions
  FOR SELECT USING (app.is_company_member(company_id));
CREATE POLICY company_member_permissions_insert ON app.company_member_permissions
  FOR INSERT WITH CHECK (app.can_manage_members(company_id));
CREATE POLICY company_member_permissions_update ON app.company_member_permissions
  FOR UPDATE USING (app.can_manage_members(company_id));
CREATE POLICY company_member_permissions_delete ON app.company_member_permissions
  FOR DELETE USING (app.can_manage_members(company_id));

-- Invites: admins manage; invitee can read by token (handled in app) or by email (via profiles; do not use auth.users - anon cannot read it)
CREATE POLICY company_invites_select ON app.company_invites
  FOR SELECT USING (
    app.is_company_member(company_id)
    OR email = (SELECT email FROM app.profiles WHERE id = app.current_user_id())
  );
CREATE POLICY company_invites_insert ON app.company_invites
  FOR INSERT WITH CHECK (app.can_manage_members(company_id));
CREATE POLICY company_invites_update ON app.company_invites
  FOR UPDATE USING (app.can_manage_members(company_id));
CREATE POLICY company_invites_delete ON app.company_invites
  FOR DELETE USING (app.can_manage_members(company_id));

-- Folders: read if can read folders; CUD if can manage_folders
CREATE POLICY folders_select ON app.folders
  FOR SELECT USING (app.can_read_folders(company_id));
CREATE POLICY folders_insert ON app.folders
  FOR INSERT WITH CHECK (app.can_manage_folders(company_id));
CREATE POLICY folders_update ON app.folders
  FOR UPDATE USING (app.can_manage_folders(company_id));
CREATE POLICY folders_delete ON app.folders
  FOR DELETE USING (app.can_manage_folders(company_id));

-- Documents: read/edit/create/delete by document permission
CREATE POLICY documents_select ON app.documents
  FOR SELECT USING (app.can_read_documents(company_id));
CREATE POLICY documents_insert ON app.documents
  FOR INSERT WITH CHECK (app.can_create_documents(company_id));
CREATE POLICY documents_update ON app.documents
  FOR UPDATE USING (app.can_edit_documents(company_id));
CREATE POLICY documents_delete ON app.documents
  FOR DELETE USING (app.can_delete_documents(company_id));

-- Document chunks: read only if can read document (same company + doc permission)
CREATE POLICY document_chunks_select ON app.document_chunks
  FOR SELECT USING (app.can_read_documents(company_id));
CREATE POLICY document_chunks_insert ON app.document_chunks
  FOR INSERT WITH CHECK (app.can_edit_documents(company_id));
CREATE POLICY document_chunks_update ON app.document_chunks
  FOR UPDATE USING (app.can_edit_documents(company_id));
CREATE POLICY document_chunks_delete ON app.document_chunks
  FOR DELETE USING (app.can_delete_documents(company_id));

-- Tasks: read/create/edit/delete by task permission
CREATE POLICY tasks_select ON app.tasks
  FOR SELECT USING (app.can_read_tasks(company_id));
CREATE POLICY tasks_insert ON app.tasks
  FOR INSERT WITH CHECK (app.can_create_tasks(company_id));
CREATE POLICY tasks_update ON app.tasks
  FOR UPDATE USING (app.can_edit_tasks(company_id));
CREATE POLICY tasks_delete ON app.tasks
  FOR DELETE USING (app.can_delete_tasks(company_id));

-- Task comments: read if can read task; insert/update/delete if can edit task
CREATE POLICY task_comments_select ON app.task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM app.tasks t
      WHERE t.id = task_id AND app.can_read_tasks(t.company_id)
    )
  );
CREATE POLICY task_comments_insert ON app.task_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM app.tasks t
      WHERE t.id = task_id AND app.can_edit_tasks(t.company_id)
    )
  );
CREATE POLICY task_comments_update ON app.task_comments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM app.tasks t
      WHERE t.id = task_id AND app.can_edit_tasks(t.company_id)
    )
  );
CREATE POLICY task_comments_delete ON app.task_comments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM app.tasks t
      WHERE t.id = task_id AND app.can_edit_tasks(t.company_id)
    )
  );

-- Audit logs: company members can read their company's logs; only service/triggers insert
CREATE POLICY audit_logs_select ON app.audit_logs
  FOR SELECT USING (
    company_id IS NULL AND app.current_user_id() IS NOT NULL
    OR app.is_company_member(company_id)
  );
CREATE POLICY audit_logs_insert ON app.audit_logs
  FOR INSERT WITH CHECK (true);

-- =============================================================================
-- TRIGGERS: Keep updated_at in sync
-- =============================================================================

CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON app.profiles
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON app.companies
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER folders_updated_at
  BEFORE UPDATE ON app.folders
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON app.documents
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON app.tasks
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER task_comments_updated_at
  BEFORE UPDATE ON app.task_comments
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- =============================================================================
-- RAG: similarity search (call from app with query embedding)
-- =============================================================================
-- query_embedding_text: JSON array string e.g. '[0.1,-0.2,...]' (1536 dims)
CREATE OR REPLACE FUNCTION app.match_document_chunks(
  query_embedding_text TEXT,
  p_company_id UUID,
  match_count INT DEFAULT 10,
  match_threshold FLOAT DEFAULT 0.0
)
RETURNS TABLE (id UUID, document_id UUID, content TEXT, chunk_index INT, similarity FLOAT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
DECLARE
  query_embedding vector(1536);
BEGIN
  query_embedding := query_embedding_text::vector(1536);
  RETURN QUERY
  SELECT dc.id, dc.document_id, dc.content, dc.chunk_index,
         (1 - (dc.embedding <=> query_embedding))::FLOAT AS similarity
  FROM app.document_chunks dc
  WHERE dc.company_id = p_company_id
    AND dc.embedding IS NOT NULL
    AND (1 - (dc.embedding <=> query_embedding)) >= match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =============================================================================
-- GRANTS: Allow Supabase client roles to use the app schema (required for custom schemas)
-- Run this block in Supabase SQL Editor if you get "permission denied for schema app"
-- anon, authenticated = browser/server with anon key; service_role = server with service role key (e.g. create company)
-- =============================================================================
GRANT USAGE ON SCHEMA app TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

-- =============================================================================
-- NOTES FOR APPLICATION
-- =============================================================================
-- 1. Create profile on sign-up (Supabase Auth trigger or app logic).
-- 2. Write to audit_logs from Server Actions / API on every create/update/delete
--    (company, folder, document, task, comment, member, permission, invite).
-- 3. RAG: chunk documents, generate embeddings (1536-dim), insert into document_chunks.
-- 4. Chatbot: filter document_chunks by company + RLS; search by embedding similarity;
--    return only chunks for documents the user can read.
-- 5. ivfflat list count (100) is for small/medium datasets; increase lists for large scale.
