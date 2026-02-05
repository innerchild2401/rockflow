import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import CreateCompanyForm from './CreateCompanyForm'

const APP_SCHEMA = 'app'

export default async function NewCompanyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id, role').eq('id', user.id).single()

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <PageHeader
        backHref="/dashboard/companies"
        backLabel="Companies"
        title="Create company"
        description="Add a new company to your workspace."
      />
      <Card>
        <CardHeader title="Company details" />
        <CardContent>
          <CreateCompanyForm userId={user.id} createdBy={profile?.id ?? user.id} />
        </CardContent>
      </Card>
    </div>
  )
}
