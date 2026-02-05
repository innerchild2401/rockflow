'use server'

import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { canManageMembers } from '@/lib/permissions'

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
        email: email.trim().toLowerCase(),
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

  const { data: company } = await supabase
    .schema(APP_SCHEMA)
    .from('companies')
    .select('slug')
    .eq('id', invite.company_id)
    .single()

  const { error: memberError } = await supabase
    .schema(APP_SCHEMA)
    .from('company_members')
    .insert({
      company_id: invite.company_id,
      user_id: user.id,
      role: 'member',
      invited_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (memberError) {
    if (memberError.code === '23505') {
      await supabase
        .schema(APP_SCHEMA)
        .from('company_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id)
      return { error: null, slug: company?.slug ?? null }
    }
    return { error: memberError.message, slug: null }
  }

  await supabase
    .schema(APP_SCHEMA)
    .from('company_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return { error: null, slug: company?.slug ?? null }
}
