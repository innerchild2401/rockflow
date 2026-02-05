import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateCompanyForm from './CreateCompanyForm'

const APP_SCHEMA = 'app'

export default async function NewCompanyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id, role').eq('id', user.id).single()

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Create company</h1>
      <CreateCompanyForm userId={user.id} createdBy={profile?.id ?? user.id} />
    </div>
  )
}
