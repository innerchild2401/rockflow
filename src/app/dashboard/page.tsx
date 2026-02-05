import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const APP_SCHEMA = 'app'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: memberships } = await supabase
    .schema(APP_SCHEMA)
    .from('company_members')
    .select('company_id, companies(id, name, slug)')
    .eq('user_id', user.id)

  type Row = { companies: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null }
  const companies = (memberships ?? []).flatMap((m: Row) => {
    const c = (m as Row).companies
    return Array.isArray(c) ? c : c ? [c] : []
  })

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Welcome back. Choose a company or create one to get started.
        </p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Your companies
        </h2>
        {companies.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            You are not a member of any company yet. Create one or accept an invite.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {companies.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/companies/${c.slug}`}
                  className="block rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6">
          <Link
            href="/dashboard/companies/new"
            className="inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Create company
          </Link>
        </div>
      </div>
    </div>
  )
}
