import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { canReadTasks, canCreateTasks } from '@/lib/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import CreateTaskForm from './CreateTaskForm'
import TasksList from './TasksList'

const APP_SCHEMA = 'app'

export default async function TasksPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: company } = await supabase.schema(APP_SCHEMA).from('companies').select('id, name, slug').eq('slug', slug).single()
  if (!company) notFound()

  const canRead = await canReadTasks(company.id)
  if (!canRead) notFound()

  const canCreate = await canCreateTasks(company.id)

  const { data: tasks } = await supabase
    .schema(APP_SCHEMA)
    .from('tasks')
    .select('id, title, status, due_date, assigned_to, updated_at')
    .eq('company_id', company.id)
    .order('updated_at', { ascending: false })

  const { data: members } = await supabase
    .schema(APP_SCHEMA)
    .from('company_members')
    .select('user_id')
    .eq('company_id', company.id)

  const userIds = [...new Set((members ?? []).map((m) => m.user_id))]
  const { data: profiles } = userIds.length
    ? await supabase.schema(APP_SCHEMA).from('profiles').select('id, display_name, email').in('id', userIds)
    : { data: [] }

  const memberNames: Record<string, string> = {}
  for (const p of profiles ?? []) {
    memberNames[p.id] = p.display_name || p.email
  }

  const tasksList = (tasks ?? []) as { id: string; title: string; status: string; due_date: string | null; assigned_to: string | null; updated_at: string }[]
  const membersList = (profiles ?? []) as { id: string; display_name: string | null; email: string }[]

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        backHref={`/dashboard/companies/${slug}`}
        backLabel={company.name}
        title="Tasks"
        description="Manage tasks and comments."
      />

      {canCreate && (
        <Card>
          <CardHeader title="New task" />
          <CardContent>
            <CreateTaskForm companyId={company.id} slug={slug} members={membersList} />
          </CardContent>
        </Card>
      )}

      <Card padding="none">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">All tasks</h2>
        </div>
        <TasksList slug={slug} tasks={tasksList} memberNames={memberNames} />
      </Card>
    </div>
  )
}
