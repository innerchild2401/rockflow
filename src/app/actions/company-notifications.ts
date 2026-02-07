'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const APP_SCHEMA = 'app'

export type CompanyNotificationType = 'member_joined'

export type CompanyNotification = {
  id: string
  company_id: string
  user_id: string
  type: CompanyNotificationType
  read_at: string | null
  created_at: string
  metadata: Record<string, unknown>
}

/** Notify all admins of a company that a new member joined (call after adding to company_members). */
export async function notifyAdminsNewMemberAction(
  companyId: string,
  newMemberId: string,
  newMemberName: string
): Promise<void> {
  const admin = createAdminClient()
  const { data: admins } = await admin
    .schema(APP_SCHEMA)
    .from('company_members')
    .select('user_id')
    .eq('company_id', companyId)
    .eq('role', 'admin')
  const adminIds = [...new Set((admins ?? []).map((a) => a.user_id).filter(Boolean))]
  if (adminIds.length === 0) return
  const rows = adminIds.map((user_id) => ({
    company_id: companyId,
    user_id,
    type: 'member_joined',
    metadata: { new_member_id: newMemberId, new_member_name: newMemberName },
  }))
  await admin.schema(APP_SCHEMA).from('company_notifications').insert(rows)
}

/** Get company-level notifications for the current user in a company. */
export async function getCompanyNotificationsAction(
  companyId: string,
  limit = 20
): Promise<{ error: string | null; notifications: CompanyNotification[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', notifications: [] }

  const { data, error } = await supabase
    .schema(APP_SCHEMA)
    .from('company_notifications')
    .select('id, company_id, user_id, type, read_at, created_at, metadata')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return { error: error.message, notifications: [] }
  return { error: null, notifications: (data ?? []) as CompanyNotification[] }
}

/** Mark company notifications as read. */
export async function markCompanyNotificationsReadAction(ids: string[]): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('company_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .in('id', ids)

  return error ? { error: error.message } : { error: null }
}

/** Get unread company notification count for current user in company. */
export async function getCompanyUnreadCountAction(companyId: string): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count } = await supabase
    .schema(APP_SCHEMA)
    .from('company_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .is('read_at', null)

  return count ?? 0
}
