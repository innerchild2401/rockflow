import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'

const APP_SCHEMA = 'app'

const navItems: { href: string; label: string; description: string; adminOnly?: boolean }[] = [
  { href: 'documents', label: 'Documents', description: 'Folders and procedures' },
  { href: 'tasks', label: 'Tasks', description: 'Tasks and comments' },
  { href: 'chat', label: 'Knowledge Base', description: 'Q&A from your documents' },
  { href: 'audit', label: 'Audit log', description: 'Activity history' },
  { href: 'members', label: 'Members', description: 'Team and permissions', adminOnly: true },
]

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
    .select('role')
    .eq('company_id', company.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) notFound()

  const isAdmin = membership.role === 'admin'

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {company.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            <Badge variant="outline">{membership.role}</Badge>
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
            <Link
              key={item.href}
              href={`/dashboard/companies/${slug}/${item.href}`}
              className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-zinc-700 dark:group-hover:text-zinc-300">
                {item.label}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {item.description}
              </p>
            </Link>
          ))}
      </div>
    </div>
  )
}
