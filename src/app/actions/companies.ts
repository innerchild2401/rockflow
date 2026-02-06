'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const APP_SCHEMA = 'app'

export async function createCompanyAction(args: { name: string; slug: string }) {
  const { name, slug } = args
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return { error: 'Not authenticated.', slug: null }
  const user = session.user

  const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is required for creating companies.', slug: null }
  }

  const { data: company, error: companyError } = await admin
    .schema(APP_SCHEMA)
    .from('companies')
    .insert({ name, slug: normalizedSlug, created_by: user.id })
    .select('id, slug')
    .single()

  if (companyError) return { error: companyError.message, slug: null }

  const { error: memberError } = await admin
    .schema(APP_SCHEMA)
    .from('company_members')
    .insert({ company_id: company.id, user_id: user.id, role: 'admin' })

  if (memberError) return { error: memberError.message, slug: company.slug }
  return { error: null, slug: company.slug }
}

