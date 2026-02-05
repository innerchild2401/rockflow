import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

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
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Welcome back. Choose a company or create one to get started.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Your companies"
          description={companies.length === 0 ? undefined : 'Select a company to open its workspace.'}
        />
        <CardContent>
          {companies.length === 0 ? (
            <EmptyState
              title="No companies yet"
              description="Create a company or accept an invite to get started."
              action={
                <Link href="/dashboard/companies/new">
                  <Button size="lg">Create company</Button>
                </Link>
              }
            />
          ) : (
            <ul className="space-y-2">
              {companies.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/companies/${c.slug}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <span>{c.name}</span>
                    <span className="text-zinc-400 dark:text-zinc-500">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {companies.length > 0 && (
            <div className="mt-6">
              <Link href="/dashboard/companies/new">
                <Button variant="outline" size="sm">
                  Create company
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
