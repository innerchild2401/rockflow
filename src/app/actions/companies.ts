'use server'

import { createClient } from '@/lib/supabase/server'

const APP_SCHEMA = 'app'

export async function createCompanyAction(args: { name: string; slug: string; createdBy: string; userId: string }) {
  const { name, slug, createdBy, userId } = args
  const supabase = await createClient()
  const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const { data: company, error: companyError } = await supabase
    .schema(APP_SCHEMA)
    .from('companies')
    .insert({ name, slug: normalizedSlug, created_by: createdBy })
    .select('id, slug')
    .single()

  if (companyError) return { error: companyError.message, slug: null }

  const { error: memberError } = await supabase
    .schema(APP_SCHEMA)
    .from('company_members')
    .insert({ company_id: company.id, user_id: userId, role: 'admin' })

  if (memberError) return { error: memberError.message, slug: company.slug }
  return { error: null, slug: company.slug }
}
