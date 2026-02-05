'use server'

import { createClient } from '@/lib/supabase/server'
import { canManageMembers } from '@/lib/permissions'
import type { CompanyMemberRole } from '@/types/database'
import type { PermissionType } from '@/types/database'

const APP_SCHEMA = 'app'

export async function updateMemberRoleAction(
  companyId: string,
  userId: string,
  role: CompanyMemberRole
) {
  const allowed = await canManageMembers(companyId)
  if (!allowed) return { error: 'You do not have permission to manage members.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (user.id === userId) return { error: 'You cannot change your own role.' }

  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('company_members')
    .update({ role })
    .eq('company_id', companyId)
    .eq('user_id', userId)

  if (error) return { error: error.message }
  return { error: null }
}

export async function removeMemberAction(companyId: string, userId: string) {
  const allowed = await canManageMembers(companyId)
  if (!allowed) return { error: 'You do not have permission to manage members.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (user.id === userId) return { error: 'You cannot remove yourself.' }

  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('company_members')
    .delete()
    .eq('company_id', companyId)
    .eq('user_id', userId)

  if (error) return { error: error.message }
  return { error: null }
}

export async function setMemberPermissionsAction(
  companyId: string,
  userId: string,
  permissions: PermissionType[]
) {
  const allowed = await canManageMembers(companyId)
  if (!allowed) return { error: 'You do not have permission to manage members.' }

  const supabase = await createClient()
  const { error: deleteError } = await supabase
    .schema(APP_SCHEMA)
    .from('company_member_permissions')
    .delete()
    .eq('company_id', companyId)
    .eq('user_id', userId)

  if (deleteError) return { error: deleteError.message }

  if (permissions.length === 0) return { error: null }

  const rows = permissions.map((permission) => ({
    company_id: companyId,
    user_id: userId,
    permission,
  }))
  const { error: insertError } = await supabase
    .schema(APP_SCHEMA)
    .from('company_member_permissions')
    .insert(rows)

  if (insertError) return { error: insertError.message }
  return { error: null }
}
