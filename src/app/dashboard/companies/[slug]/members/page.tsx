import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { canManageMembers } from '@/lib/permissions'
import MembersList from './MembersList'
import InviteForm from './InviteForm'
import PendingInvites from './PendingInvites'

const APP_SCHEMA = 'app'

export default async function MembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: company } = await supabase.schema(APP_SCHEMA).from('companies').select('id, name, slug').eq('slug', slug).single()
  if (!company) notFound()

  const manageAllowed = await canManageMembers(company.id)
  if (!manageAllowed) notFound()

  const { data: members } = await supabase
    .schema(APP_SCHEMA)
    .from('company_members')
    .select('id, user_id, role, profiles:user_id(id, email, display_name)')
    .eq('company_id', company.id)
    .order('joined_at', { ascending: true })

  const { data: perms } = await supabase
    .schema(APP_SCHEMA)
    .from('company_member_permissions')
    .select('user_id, permission')
    .eq('company_id', company.id)

  const permsByUser: Record<string, string[]> = {}
  ;(perms ?? []).forEach((p: { user_id: string; permission: string }) => {
    if (!permsByUser[p.user_id]) permsByUser[p.user_id] = []
    permsByUser[p.user_id].push(p.permission)
  })

  type M = { id: string; user_id: string; role: string; profiles: { email: string; display_name: string | null } | { email: string; display_name: string | null }[] | null }
  const memberList = (members ?? []).map((m: M) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return {
      id: m.id,
      userId: m.user_id,
      role: m.role as 'admin' | 'member',
      email: p?.email ?? '',
      displayName: p?.display_name ?? null,
      permissions: permsByUser[m.user_id] ?? [],
    }
  })

  const { data: invites } = await supabase
    .schema(APP_SCHEMA)
    .from('company_invites')
    .select('id, email, expires_at, created_at')
    .eq('company_id', company.id)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href={`/dashboard/companies/${slug}`} className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">← {company.name}</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Members</h1>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Invite by email</h2>
        <InviteForm companyId={company.id} slug={slug} />
      </div>
      {invites && invites.length > 0 && <PendingInvites invites={invites} slug={slug} />}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="border-b border-zinc-200 px-6 py-4 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-50">Members ({memberList.length})</h2>
        <MembersList members={memberList} companyId={company.id} slug={slug} currentUserId={user.id} canManage={manageAllowed} />
      </div>
    </div>
  )
}
