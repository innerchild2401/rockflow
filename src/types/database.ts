/**
 * Types matching app schema in Supabase.
 * All tables live in the `app` schema.
 */

export type UserRole = 'employee' | 'enterprise_admin'
export type CompanyMemberRole = 'admin' | 'member'
export type PermissionType =
  | 'read'
  | 'edit'
  | 'create'
  | 'delete'
  | 'manage_folders'
  | 'manage_documents'
  | 'manage_tasks'
  | 'manage_members'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type AuditAction = 'created' | 'updated' | 'deleted'
export type AuditEntityType =
  | 'company'
  | 'folder'
  | 'document'
  | 'task'
  | 'comment'
  | 'member'
  | 'permission'
  | 'invite'

export interface Profile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  name: string
  slug: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface CompanyMember {
  id: string
  company_id: string
  user_id: string
  role: CompanyMemberRole
  invited_at: string | null
  joined_at: string
  created_at: string
}

export interface CompanyMemberPermission {
  id: string
  company_id: string
  user_id: string
  permission: PermissionType
  created_at: string
}

export interface CompanyInvite {
  id: string
  company_id: string
  email: string
  invited_by: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface Folder {
  id: string
  company_id: string
  parent_folder_id: string | null
  name: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  company_id: string
  folder_id: string | null
  title: string
  content: string
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  company_id: string
  title: string
  description: string | null
  status: TaskStatus
  due_date: string | null
  assigned_to: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  parent_comment_id: string | null
  user_id: string
  body: string
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  company_id: string | null
  user_id: string | null
  action: AuditAction
  entity_type: AuditEntityType
  entity_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
}

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'> & {
  created_at?: string
  updated_at?: string
}
export type CompanyInsert = Omit<Company, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
}
export type CompanyMemberInsert = Omit<
  CompanyMember,
  'id' | 'joined_at' | 'created_at'
> & {
  id?: string
  joined_at?: string
  created_at?: string
}
