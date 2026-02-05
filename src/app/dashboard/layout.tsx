import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { upsertProfileFromAuth } from '@/app/actions/profile'
import Link from 'next/link'

const APP_SCHEMA = 'app'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await upsertProfileFromAuth()

  const { data: profile } = await supabase
    .schema(APP_SCHEMA)
    .from('profiles')
    .select('id, display_name, email, role')
    .eq('id', user.id)
    .single()

  const { data: memberships } = await supabase
    .schema(APP_SCHEMA)
    .from('company_members')
    .select('company_id, companies(id, name, slug)')
    .eq('user_id', user.id)

  type CompanyRow = { companies: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null }
  const companies = (memberships ?? []).flatMap((m: CompanyRow) => {
    const c = m.companies
    return Array.isArray(c) ? c : c ? [c] : []
  }) as { id: string; name: string; slug: string }[]

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Rockflow
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {profile?.display_name ?? profile?.email ?? user.email}
            </span>
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <aside className="fixed left-0 top-14 z-10 h-[calc(100vh-3.5rem)] w-56 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <nav className="flex flex-col gap-1 p-4">
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Home
          </Link>
          <Link
            href="/dashboard/companies"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Companies
          </Link>
          {companies.length > 0 && (
            <>
              <div className="my-2 border-t border-zinc-200 dark:border-zinc-700" />
              <p className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Your companies
              </p>
              {companies.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/companies/${c.slug}`}
                  className="rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  {c.name}
                </Link>
              ))}
            </>
          )}
        </nav>
      </aside>
      <main className="pl-56 pt-14">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
