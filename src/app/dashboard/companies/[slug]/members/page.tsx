import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { canManageMembers } from '@/lib/permissions'
import { NoPermission } from '@/components/ui/NoPermission'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
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
  if (!manageAllowed) {
    return (
      <NoPermission
        title="You don't have permission to view members"
        backHref={`/dashboard/companies/${slug}`}
        backLabel={company.name}
      />
    )
  }

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
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        backHref={`/dashboard/companies/${slug}`}
        backLabel={company.name}
        title="Members"
        description="Team and permissions for this company."
      />
      <Card>
        <CardHeader title="Generate invite link" />
        <CardContent>
          <InviteForm companyId={company.id} slug={slug} />
        </CardContent>
      </Card>
      {invites && invites.length > 0 && <PendingInvites invites={invites} slug={slug} />}
      <Card padding="none">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Members ({memberList.length})</h2>
        </div>
        <MembersList members={memberList} companyId={company.id} slug={slug} currentUserId={user.id} canManage={manageAllowed} />
      </Card>
    </div>
  )
}
