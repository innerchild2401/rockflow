import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { canReadTasks } from '@/lib/permissions'

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

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href={`/dashboard/companies/${slug}`} className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">← {company.name}</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Tasks</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Task management and comments coming next.</p>
      </div>
    </div>
  )
}
