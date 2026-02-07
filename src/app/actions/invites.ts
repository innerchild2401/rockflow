'use server'

import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyAdminsNewMemberAction } from '@/app/actions/company-notifications'
import { canManageMembers } from '@/lib/permissions'
import { upsertProfileFromAuth } from '@/app/actions/profile'

const APP_SCHEMA = 'app'

function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export async function createInviteAction(companyId: string, email: string) {
  const allowed = await canManageMembers(companyId)
  if (!allowed) return { error: 'You do not have permission to invite members.', token: null }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', token: null }

  const emailNorm = email.trim().toLowerCase()
  const now = new Date().toISOString()

  // If there's already a pending invite for this email, return its link so it doesn't "disappear" or get replaced
  const { data: existing } = await supabase
    .schema(APP_SCHEMA)
    .from('company_invites')
    .select('token, expires_at')
    .eq('company_id', companyId)
    .eq('email', emailNorm)
    .is('accepted_at', null)
    .is('declined_at', null)
    .is('dismissed_at', null)
    .gt('expires_at', now)
    .maybeSingle()

  if (existing?.token) {
    // Optionally extend expiry when re-requesting the same link
    const newExpiresAt = new Date()
    newExpiresAt.setDate(newExpiresAt.getDate() + 7)
    await supabase
      .schema(APP_SCHEMA)
      .from('company_invites')
      .update({ expires_at: newExpiresAt.toISOString() })
      .eq('company_id', companyId)
      .eq('email', emailNorm)
    return { error: null, token: existing.token }
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data: profile } = await supabase
    .schema(APP_SCHEMA)
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  const token = generateToken()
  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('company_invites')
    .upsert(
      {
        company_id: companyId,
        email: emailNorm,
        invited_by: profile?.id ?? user.id,
        token,
        expires_at: expiresAt.toISOString(),
        accepted_at: null,
      },
      { onConflict: 'company_id,email' }
    )

  if (error) return { error: error.message, token: null }
  return { error: null, token }
}

export async function acceptInviteAction(token: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', slug: null }

  const { data: invite, error: inviteError } = await supabase
    .schema(APP_SCHEMA)
    .from('company_invites')
    .select('id, company_id, email, expires_at, accepted_at')
    .eq('token', token)
    .single()

  if (inviteError || !invite) return { error: 'Invalid or expired invite.', slug: null }
  if (invite.accepted_at) return { error: 'Invite already accepted.', slug: null }
  if (new Date(invite.expires_at) < new Date()) return { error: 'Invite has expired.', slug: null }
  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    return { error: 'This invite was sent to a different email address.', slug: null }
  }

  // Ensure profile exists (new signups may not have run dashboard layout yet)
  const profileResult = await upsertProfileFromAuth()
  if (profileResult?.error) return { error: profileResult.error, slug: null }

  const { data: company } = await supabase
    .schema(APP_SCHEMA)
    .from('companies')
    .select('slug')
    .eq('id', invite.company_id)
    .single()

  // Upsert so we don't fail with unique violation if already a member (e.g. double submit, retry)
  const invitedAt = new Date().toISOString()
  const { error: memberError } = await supabase
    .schema(APP_SCHEMA)
    .from('company_members')
    .upsert(
      {
        company_id: invite.company_id,
        user_id: user.id,
        role: 'member',
        invited_at: invitedAt,
        joined_at: invitedAt,
      },
      { onConflict: 'company_id,user_id' }
    )
    .select()
    .single()

  if (memberError) return { error: memberError.message, slug: null }

  await supabase
    .schema(APP_SCHEMA)
    .from('company_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return { error: null, slug: company?.slug ?? null }
}

export type MyInvite = {
  id: string
  company_id: string
  company_name: string
  company_slug: string
  expires_at: string
  inviter_name: string
}

/** List pending invites for the current user (email match, not accepted/declined/dismissed, not expired). */
export async function getMyInvitesAction(): Promise<{ error: string | null; invites: MyInvite[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: null, invites: [] }

  const emailNorm = user.email.toLowerCase().trim()
  const now = new Date().toISOString()

  const { data: rows, error } = await supabase
    .schema(APP_SCHEMA)
    .from('company_invites')
    .select('id, company_id, email, expires_at, invited_by')
    .eq('email', emailNorm)
    .is('accepted_at', null)
    .is('declined_at', null)
    .is('dismissed_at', null)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message, invites: [] }
  if (!rows?.length) return { error: null, invites: [] }

  const companyIds = [...new Set(rows.map((r) => r.company_id))]
  const inviterIds = [...new Set(rows.map((r) => r.invited_by))]

  const { data: companies } = await supabase
    .schema(APP_SCHEMA)
    .from('companies')
    .select('id, name, slug')
    .in('id', companyIds)
  const companyBy: Record<string, { name: string; slug: string }> = {}
  for (const c of companies ?? []) companyBy[c.id] = { name: c.name, slug: c.slug }

  const { data: profiles } = await supabase
    .schema(APP_SCHEMA)
    .from('profiles')
    .select('id, display_name, email')
    .in('id', inviterIds)
  const inviterBy: Record<string, string> = {}
  for (const p of profiles ?? []) inviterBy[p.id] = p.display_name || p.email || 'Someone'

  const invites: MyInvite[] = rows.map((r) => ({
    id: r.id,
    company_id: r.company_id,
    company_name: companyBy[r.company_id]?.name ?? 'Unknown',
    company_slug: companyBy[r.company_id]?.slug ?? '',
    expires_at: r.expires_at,
    inviter_name: inviterBy[r.invited_by] ?? 'Someone',
  }))

  return { error: null, invites }
}

/** Count pending invites for the current user (for badge). */
export async function getPendingInviteCountAction(): Promise<{ error: string | null; count: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: null, count: 0 }

  const emailNorm = user.email.toLowerCase().trim()
  const now = new Date().toISOString()

  const { count, error } = await supabase
    .schema(APP_SCHEMA)
    .from('company_invites')
    .select('id', { count: 'exact', head: true })
    .eq('email', emailNorm)
    .is('accepted_at', null)
    .is('declined_at', null)
    .is('dismissed_at', null)
    .gt('expires_at', now)

  if (error) return { error: error.message, count: 0 }
  return { error: null, count: count ?? 0 }
}

/** Accept an invite by id (from inbox). Validates with user client, then uses admin client so insert bypasses RLS. */
export async function acceptInviteByIdAction(inviteId: string): Promise<{ error: string | null; slug: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', slug: null }

  const { data: invite, error: inviteError } = await supabase
    .schema(APP_SCHEMA)
    .from('company_invites')
    .select('id, company_id, email, expires_at, accepted_at')
    .eq('id', inviteId)
    .single()

  if (inviteError || !invite) return { error: 'Invite not found.', slug: null }
  if (invite.accepted_at) return { error: 'Invite already accepted.', slug: null }
  if (new Date(invite.expires_at) < new Date()) return { error: 'Invite has expired.', slug: null }
  const inviteEmailNorm = invite.email?.toLowerCase().trim()
  const userEmailNorm = user.email?.toLowerCase().trim()
  if (!inviteEmailNorm || !userEmailNorm || inviteEmailNorm !== userEmailNorm) {
    return { error: 'This invite was sent to a different email address.', slug: null }
  }

  const profileResult = await upsertProfileFromAuth()
  if (profileResult?.error) return { error: profileResult.error, slug: null }

  const { data: company } = await supabase
    .schema(APP_SCHEMA)
    .from('companies')
    .select('slug')
    .eq('id', invite.company_id)
    .single()

  const invitedAt = new Date().toISOString()
  const admin = createAdminClient()
  const { error: memberError } = await admin
    .schema(APP_SCHEMA)
    .from('company_members')
    .upsert(
      {
        company_id: invite.company_id,
        user_id: user.id,
        role: 'member',
        invited_at: invitedAt,
        joined_at: invitedAt,
      },
      { onConflict: 'company_id,user_id' }
    )

  if (memberError) return { error: memberError.message, slug: null }

  await admin
    .schema(APP_SCHEMA)
    .from('company_invites')
    .update({ accepted_at: invitedAt })
    .eq('id', invite.id)

  try {
    const { data: profile } = await supabase
      .schema(APP_SCHEMA)
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    const newMemberName = profile?.display_name?.trim() || user.email?.split('@')[0] || 'New member'
    await notifyAdminsNewMemberAction(invite.company_id, user.id, newMemberName)
  } catch {
    // company_notifications table may not exist yet; accept still succeeds
  }

  return { error: null, slug: company?.slug ?? null }
}

/** Refuse an invite (decline). */
export async function refuseInviteAction(inviteId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Not authenticated.' }

  const { data: invite } = await supabase
    .schema(APP_SCHEMA)
    .from('company_invites')
    .select('id, email')
    .eq('id', inviteId)
    .single()

  if (!invite || invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: 'Invite not found or not for you.' }
  }

  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('company_invites')
    .update({ declined_at: new Date().toISOString() })
    .eq('id', inviteId)

  return error ? { error: error.message } : { error: null }
}

/** Ignore an invite (dismiss from inbox; link still valid if they have it). */
export async function ignoreInviteAction(inviteId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Not authenticated.' }

  const { data: invite } = await supabase
    .schema(APP_SCHEMA)
    .from('company_invites')
    .select('id, email')
    .eq('id', inviteId)
    .single()

  if (!invite || invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: 'Invite not found or not for you.' }
  }

  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('company_invites')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', inviteId)

  return error ? { error: error.message } : { error: null }
}
