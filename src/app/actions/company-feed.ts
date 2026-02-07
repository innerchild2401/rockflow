'use server'

import { createClient } from '@/lib/supabase/server'

const APP_SCHEMA = 'app'

export type FeedPost = {
  id: string
  company_id: string
  user_id: string
  body: string
  created_at: string
  author_name: string
}

/** List company feed posts (oldest first so newest is at bottom). */
export async function getCompanyFeedAction(companyId: string, limit = 50): Promise<{ error: string | null; posts: FeedPost[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', posts: [] }

  const { data: member } = await supabase
    .schema(APP_SCHEMA)
    .from('company_members')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .single()
  if (!member) return { error: 'Not a member of this company.', posts: [] }

  const { data: rows, error } = await supabase
    .schema(APP_SCHEMA)
    .from('company_feed')
    .select('id, company_id, user_id, body, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) return { error: error.message, posts: [] }
  if (!rows?.length) return { error: null, posts: [] }

  const userIds = [...new Set(rows.map((r) => r.user_id))]
  const { data: profiles } = await supabase
    .schema(APP_SCHEMA)
    .from('profiles')
    .select('id, display_name, email')
    .in('id', userIds)
  const nameBy: Record<string, string> = {}
  for (const p of profiles ?? []) {
    nameBy[p.id] = p.display_name || p.email
  }

  const posts: FeedPost[] = rows.map((r) => ({
    id: r.id,
    company_id: r.company_id,
    user_id: r.user_id,
    body: r.body,
    created_at: r.created_at,
    author_name: nameBy[r.user_id] ?? 'Unknown',
  }))

  return { error: null, posts }
}

/** Post to company feed. */
export async function postCompanyFeedAction(companyId: string, body: string): Promise<{ error: string | null; id: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', id: null }

  const { data: member } = await supabase
    .schema(APP_SCHEMA)
    .from('company_members')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .single()
  if (!member) return { error: 'Not a member of this company.', id: null }

  const trimmed = body.trim()
  if (!trimmed) return { error: 'Message cannot be empty.', id: null }

  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const { data, error } = await supabase
    .schema(APP_SCHEMA)
    .from('company_feed')
    .insert({
      company_id: companyId,
      user_id: profile?.id ?? user.id,
      body: trimmed,
    })
    .select('id')
    .single()

  if (error) return { error: error.message, id: null }
  return { error: null, id: data?.id ?? null }
}
