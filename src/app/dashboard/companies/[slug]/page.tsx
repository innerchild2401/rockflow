import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import CompanyPageLayout from './CompanyPageLayout'

const APP_SCHEMA = 'app'

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

  return (
    <div className="mx-auto flex min-h-0 max-w-4xl flex-1 flex-col overflow-hidden md:max-w-7xl">
      {/* Desktop: full page header. Mobile: back lives inside CompanyPageLayout to save space */}
      <div className="mb-8 hidden flex-col gap-4 sm:flex-row sm:items-start sm:justify-between md:mb-0 md:flex">
        <PageHeader
          backHref="/dashboard/companies"
          backLabel="Companies"
          title={company.name}
          description="Past hour recap and team feed"
          action={<Badge variant="outline">{membership.role}</Badge>}
        />
      </div>
      <div className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden md:mt-8">
        <CompanyPageLayout
          companyId={company.id}
          currentUserId={user.id}
          backHref="/dashboard/companies"
          backLabel="Companies"
        />
      </div>
    </div>
  )
}
