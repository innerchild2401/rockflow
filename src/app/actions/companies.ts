'use server'

import { createClient } from '@/lib/supabase/server'

const APP_SCHEMA = 'app'

export async function createCompanyAction(args: { name: string; slug: string }) {
  const { name, slug } = args
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', slug: null }

  const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const { data: company, error: companyError } = await supabase
    .schema(APP_SCHEMA)
    .from('companies')
    .insert({ name, slug: normalizedSlug, created_by: user.id })
    .select('id, slug')
    .single()

  if (companyError) return { error: companyError.message, slug: null }

  const { error: memberError } = await supabase
    .schema(APP_SCHEMA)
    .from('company_members')
    .insert({ company_id: company.id, user_id: user.id, role: 'admin' })

  if (memberError) return { error: memberError.message, slug: company.slug }
  return { error: null, slug: company.slug }
}

