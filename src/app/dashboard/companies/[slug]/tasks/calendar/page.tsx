import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { canReadTasks } from '@/lib/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

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
  if (!canRead) notFound()

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        backHref={`/dashboard/companies/${slug}`}
        backLabel={company.name}
        title="Calendar"
        description="Task calendar view and Google Calendar sync (coming soon)."
      />
      <Card className="flex min-h-[320px] items-center justify-center">
        <EmptyState
          title="Calendar view"
          description="Calendar view for tasks and Google Calendar sync will be available in a future update. Use the Tasks list for now."
        />
      </Card>
    </div>
  )
}
