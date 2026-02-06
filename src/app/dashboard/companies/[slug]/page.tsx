import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import CompanyRecapCard from './CompanyRecapCard'
import CompanyFeed from './CompanyFeed'

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
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        backHref="/dashboard/companies"
        backLabel="Companies"
        title={company.name}
        description="Past hour recap and team feed"
        action={<Badge variant="outline">{membership.role}</Badge>}
      />

      <CompanyRecapCard companyId={company.id} />
      <CompanyFeed companyId={company.id} currentUserId={user.id} />
    </div>
  )
}
