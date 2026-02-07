import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { canReadTasks, canEditTasks } from '@/lib/permissions'
import { NoPermission } from '@/components/ui/NoPermission'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import TasksCalendar from './TasksCalendar'
import GoogleCalendarSync from './GoogleCalendarSync'

const APP_SCHEMA = 'app'

export default async function TasksCalendarPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: company } = await supabase.schema(APP_SCHEMA).from('companies').select('id, name, slug').eq('slug', slug).single()
  if (!company) notFound()

  const canRead = await canReadTasks(company.id)
  if (!canRead) {
    return (
      <NoPermission
        title="You don't have permission to view the calendar"
        backHref={`/dashboard/companies/${slug}`}
        backLabel={company.name}
      />
    )
  }
  
  const canEdit = await canEditTasks(company.id)

  // Fetch all tasks with due dates
  const { data: tasks } = await supabase
    .schema(APP_SCHEMA)
    .from('tasks')
    .select('id, title, status, due_date, assigned_to, updated_at')
    .eq('company_id', company.id)

  // Get member names
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

  const tasksList = (tasks ?? []) as {
    id: string
    title: string
    status: string
    due_date: string | null
    assigned_to: string | null
    updated_at: string
  }[]
  
  const membersList = (profiles ?? []) as { id: string; display_name: string | null; email: string }[]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        backHref={`/dashboard/companies/${slug}`}
        backLabel={company.name}
        title="Calendar"
        description="View tasks organized by their due dates."
      />
      <GoogleCalendarSync companyId={company.id} slug={slug} />
      <Card padding="lg">
        <TasksCalendar
          companyId={company.id}
          slug={slug}
          tasks={tasksList}
          memberNames={memberNames}
          members={membersList}
          canEdit={canEdit}
        />
      </Card>
    </div>
  )
}
