import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import CreateCompanyForm from './CreateCompanyForm'

export default async function NewCompanyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
          <CreateCompanyForm />
        </CardContent>
      </Card>
    </div>
  )
}
