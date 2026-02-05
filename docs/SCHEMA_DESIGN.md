# Database Schema Design — Multi-Tenant Knowledge & Operations Platform

## Overview

- **Multi-tenant**: One user can belong to multiple companies via `company_members`.
- **Permissions**: Per-user, per-company; enforced in UI, API, and RLS.
- **Audit**: All important mutations write to `audit_logs` (who, action, entity, old/new value).
- **RAG-ready**: Documents → chunks → embeddings in `document_chunks` (pgvector).

---

## Entity Relationship Summary

```
auth.users (Supabase)
    ↓
profiles (1:1 with auth.users)
    ↓
company_members (user ↔ company, role: admin | member)
    ↓
company_member_permissions (per user per company: read, edit, create, delete, manage_*)
    ↓
company_invites (pending invites by email)

companies
    ├── folders (parent_folder_id self-ref)
    ├── documents (folder_id nullable)
    │   └── document_chunks (for RAG, with embedding vector)
    ├── tasks (assigned_to → profiles)
    │   └── task_comments (parent_comment_id for threads)
    └── audit_logs (all mutations)
```

---

## Permission Model

- **Company admin**: full access in that company; no row in `company_member_permissions` needed (RLS treats admin as having all).
- **Company member**: has explicit rows in `company_member_permissions` with permission types:
  - `read`, `edit`, `create`, `delete`
  - `manage_folders`, `manage_documents`, `manage_tasks`, `manage_members`
- **Semantics**: `manage_*` implies full CRUD for that resource. Otherwise check `read`/`edit`/`create`/`delete` as needed for that resource type.

---

## Tables

| Table | Purpose |
|-------|--------|
| `profiles` | Public user info (id = auth.users.id) |
| `companies` | Tenant; created by enterprise admin |
| `company_members` | User ↔ Company; role admin | member |
| `company_member_permissions` | Per-user per-company capability set |
| `company_invites` | Pending invite by email (no approval flow) |
| `folders` | Folder tree per company |
| `documents` | Procedures/documents; optional folder |
| `document_chunks` | Chunked content + embedding for RAG |
| `tasks` | Task with assignee, status, due date |
| `task_comments` | Threaded comments on tasks |
| `audit_logs` | Who did what, when, old/new value |

---

## RLS Strategy

- All tables scoped by `company_id` where applicable.
- Helpers: `auth.uid()`, `is_company_member(company_id)`, `is_company_admin(company_id)`, `has_permission(company_id, permission_type)`.
- Permissions enforced in RLS: e.g. documents SELECT if read or manage_documents; INSERT/UPDATE/DELETE if create/edit or manage_documents, etc.

---

## Expose `app` schema in Supabase

After running `schema.sql`, expose the `app` schema so the Supabase client can query it:

1. Supabase Dashboard → **Project Settings** → **API**
2. Under **Exposed schemas**, add `app` (or ensure it is listed)
3. Save. The REST API will then allow `supabase.schema('app').from('table_name')` from the app.

## Next Step

See `schema.sql` for the full SQL (types, tables, indexes, RLS, helpers). Paste it into Supabase SQL Editor and run. After you confirm the schema is applied, we can proceed to auth flows, company onboarding, permissions UI, documents, tasks, audit UI, and RAG pipeline.
