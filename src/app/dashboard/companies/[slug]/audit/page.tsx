import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'

const APP_SCHEMA = 'app'

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ all?: string }>
}) {
  const { slug } = await params
  const { all } = await searchParams
  const showAll = all === '1'
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
    .select('id, user_id, action, entity_type, entity_id, old_value, new_value, created_at')
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
  /** Human-readable action for display (e.g. "Completed" for task status → done). */
  function getActionLabel(row: { action: string; entity_type: string; new_value?: { status?: string } | null }): string {
    if (row.entity_type === 'task' && row.action === 'updated' && row.new_value?.status === 'done')
      return 'Completed'
    return actionLabels[row.action] ?? row.action
  }
  /** Summary of what changed (e.g. task title, document title, "Task completed"). */
  function getSummary(row: {
    entity_type: string
    action: string
    old_value?: { title?: string; status?: string } | null
    new_value?: { title?: string; status?: string; uploaded?: boolean; file_name?: string } | null
  }): string {
    const title = row.new_value?.title ?? row.old_value?.title
    if (row.entity_type === 'task') {
      if (row.action === 'created') return title ? `Task: ${title}` : 'Task'
      if (row.action === 'updated' && row.new_value?.status === 'done') return title ? `Task completed: ${title}` : 'Task completed'
      if (row.action === 'deleted') return row.old_value?.title ? `Task deleted: ${row.old_value.title}` : 'Task deleted'
      return title ?? 'Task'
    }
    if (row.entity_type === 'document') {
      if (row.action === 'created' && row.new_value?.uploaded) return row.new_value?.file_name ? `Uploaded: ${row.new_value.file_name}` : title ? `Uploaded: ${title}` : 'Document uploaded'
      if (row.action === 'created') return title ? `Document: ${title}` : 'Document'
      if (row.action === 'deleted') return row.old_value?.title ? `Document deleted: ${row.old_value.title}` : 'Document deleted'
      return title ?? 'Document'
    }
    return entityLabels[row.entity_type] ?? row.entity_type
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

  type AuditRow = {
    id: string
    user_id: string | null
    action: string
    entity_type: string
    entity_id: string | null
    old_value?: { title?: string; status?: string } | null
    new_value?: { title?: string; status?: string; uploaded?: boolean; file_name?: string } | null
    created_at: string
  }
  const allRows = (logs ?? []) as AuditRow[]
  const focusTaskAndDocument = (r: AuditRow) => r.entity_type === 'task' || r.entity_type === 'document'
  const rows = showAll ? allRows : allRows.filter(focusTaskAndDocument)

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        backHref={`/dashboard/companies/${slug}`}
        backLabel={company.name}
        title="Audit log"
        description={showAll ? 'All activity (last 200 entries).' : 'Task and document activity: creation, completion, deletion, uploads (last 200 entries).'}
      />

      {!showAll && allRows.some((r) => !focusTaskAndDocument(r)) && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Showing only tasks and documents.{' '}
          <a href={`/dashboard/companies/${slug}/audit?all=1`} className="text-blue-600 underline dark:text-blue-400">
            Show all activity
          </a>
        </p>
      )}
      {showAll && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          <a href={`/dashboard/companies/${slug}/audit`} className="text-blue-600 underline dark:text-blue-400">
            Focus on tasks & documents
          </a>
        </p>
      )}

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">When</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Summary</th>
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
                    {getActionLabel(row)}
                  </td>
                  <td className="px-6 py-3 text-sm text-zinc-900 dark:text-zinc-50">
                    {getSummary(row) || (entityLabels[row.entity_type] ?? row.entity_type)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {showAll ? 'No audit entries yet.' : 'No task or document activity yet.'}
          </div>
        )}
      </Card>
    </div>
  )
}
