import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { canReadTasks, canCreateTasks } from '@/lib/permissions'
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
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href={`/dashboard/companies/${slug}`} className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">← {company.name}</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Tasks</h1>
      </div>

      {canCreate && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">New task</h2>
          <CreateTaskForm companyId={company.id} slug={slug} members={membersList} />
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="border-b border-zinc-200 px-6 py-4 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-50">All tasks</h2>
        <TasksList slug={slug} tasks={tasksList} memberNames={memberNames} />
      </div>
    </div>
  )
}
