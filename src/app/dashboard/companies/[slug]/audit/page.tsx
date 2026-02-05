import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const APP_SCHEMA = 'app'

export default async function AuditPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: company } = await supabase
    .schema(APP_SCHEMA)
    .from('companies')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!company) notFound()

  const { data: membership } = await supabase
    .schema(APP_SCHEMA)
    .from('company_members')
    .select('id')
    .eq('company_id', company.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) notFound()

  const { data: logs } = await supabase
    .schema(APP_SCHEMA)
    .from('audit_logs')
    .select('id, user_id, action, entity_type, entity_id, created_at')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(200)

  const userIds = [...new Set((logs ?? []).map((l) => l.user_id).filter(Boolean) as string[])]
  const { data: profiles } = userIds.length
    ? await supabase.schema(APP_SCHEMA).from('profiles').select('id, display_name, email').in('id', userIds)
    : { data: [] }

  const userNames: Record<string, string> = {}
  for (const p of profiles ?? []) {
    userNames[p.id] = p.display_name || p.email
  }

  const actionLabels: Record<string, string> = {
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
  }
  const entityLabels: Record<string, string> = {
    company: 'Company',
    folder: 'Folder',
    document: 'Document',
    task: 'Task',
    comment: 'Comment',
    member: 'Member',
    permission: 'Permission',
    invite: 'Invite',
  }

  const rows = (logs ?? []) as { id: string; user_id: string | null; action: string; entity_type: string; entity_id: string | null; created_at: string }[]

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link
          href={`/dashboard/companies/${slug}`}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← {company.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Audit log
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Recent activity for this company (last 200 entries).
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">When</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Entity</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-6 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-sm text-zinc-900 dark:text-zinc-50">
                    {row.user_id ? (userNames[row.user_id] ?? row.user_id.slice(0, 8)) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-sm text-zinc-900 dark:text-zinc-50">
                    {actionLabels[row.action] ?? row.action}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-sm text-zinc-900 dark:text-zinc-50">
                    {entityLabels[row.entity_type] ?? row.entity_type}
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {row.entity_id ? row.entity_id.slice(0, 8) + '…' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No audit entries yet.
          </div>
        )}
      </div>
    </div>
  )
}
