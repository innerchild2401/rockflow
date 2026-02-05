import { createClient } from '@/lib/supabase/server'
import type { PermissionType } from '@/types/database'

const APP_SCHEMA = 'app'

export async function getCurrentUserCompanyRole(companyId: string): Promise<'admin' | 'member' | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .schema(APP_SCHEMA)
    .from('company_members')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .single()

  return (data?.role as 'admin' | 'member') ?? null
}

export async function canManageMembers(companyId: string): Promise<boolean> {
  const role = await getCurrentUserCompanyRole(companyId)
  if (role === 'admin') return true

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .schema(APP_SCHEMA)
    .from('company_member_permissions')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .eq('permission', 'manage_members')
    .maybeSingle()

  return !!data
}

export async function hasPermission(companyId: string, permission: PermissionType): Promise<boolean> {
  const role = await getCurrentUserCompanyRole(companyId)
  if (role === 'admin') return true

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .schema(APP_SCHEMA)
    .from('company_member_permissions')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .eq('permission', permission)
    .maybeSingle()

  return !!data
}

export async function canReadDocuments(companyId: string): Promise<boolean> {
  return (
    (await hasPermission(companyId, 'read')) ||
    (await hasPermission(companyId, 'manage_documents'))
  )
}

export async function canEditDocuments(companyId: string): Promise<boolean> {
  return (
    (await hasPermission(companyId, 'edit')) ||
    (await hasPermission(companyId, 'manage_documents'))
  )
}

export async function canCreateDocuments(companyId: string): Promise<boolean> {
  return (
    (await hasPermission(companyId, 'create')) ||
    (await hasPermission(companyId, 'manage_documents'))
  )
}

export async function canDeleteDocuments(companyId: string): Promise<boolean> {
  return (
    (await hasPermission(companyId, 'delete')) ||
    (await hasPermission(companyId, 'manage_documents'))
  )
}

export async function canManageFolders(companyId: string): Promise<boolean> {
  return await hasPermission(companyId, 'manage_folders')
}

export async function canReadTasks(companyId: string): Promise<boolean> {
  return (
    (await hasPermission(companyId, 'read')) ||
    (await hasPermission(companyId, 'manage_tasks'))
  )
}

export async function canEditTasks(companyId: string): Promise<boolean> {
  return (
    (await hasPermission(companyId, 'edit')) ||
    (await hasPermission(companyId, 'manage_tasks'))
  )
}

export async function canCreateTasks(companyId: string): Promise<boolean> {
  return (
    (await hasPermission(companyId, 'create')) ||
    (await hasPermission(companyId, 'manage_tasks'))
  )
}

export async function canDeleteTasks(companyId: string): Promise<boolean> {
  return (
    (await hasPermission(companyId, 'delete')) ||
    (await hasPermission(companyId, 'manage_tasks'))
  )
}
