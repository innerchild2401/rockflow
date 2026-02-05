import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { upsertProfileFromAuth } from '@/app/actions/profile'
import { AppShell } from '@/components/app-shell/AppShell'

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
    <AppShell
      companies={companies}
      profile={{
        id: profile?.id ?? user.id,
        display_name: profile?.display_name ?? null,
        email: profile?.email ?? user.email ?? null,
      }}
    >
      {children}
    </AppShell>
  )
}
