import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AcceptInviteClient from './AcceptInviteClient'

const APP_SCHEMA = 'app'

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/dashboard/accept-invite?token=${token}`)}`)
  if (!token) redirect('/dashboard')

  const { data: invite } = await supabase.schema(APP_SCHEMA).from('company_invites').select('id, company_id, email, expires_at, accepted_at').eq('token', token).single()
  if (!invite) return <div className="flex min-h-[60vh] items-center justify-center p-6"><p className="text-zinc-600 dark:text-zinc-400">Invalid or expired invite.</p></div>
  if (invite.accepted_at) {
    const { data: company } = await supabase.schema(APP_SCHEMA).from('companies').select('slug').eq('id', invite.company_id).single()
    redirect(company?.slug ? `/dashboard/companies/${company.slug}` : '/dashboard')
  }
  if (new Date(invite.expires_at) < new Date()) return <div className="flex min-h-[60vh] items-center justify-center p-6"><p className="text-zinc-600 dark:text-zinc-400">Invite expired.</p></div>
  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) return <div className="flex min-h-[60vh] items-center justify-center p-6"><p className="text-zinc-600 dark:text-zinc-400">Invite was sent to {invite.email}.</p></div>

  return <AcceptInviteClient token={token} />
}
