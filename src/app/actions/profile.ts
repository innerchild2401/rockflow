'use server'

import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

const APP_SCHEMA = 'app'

export async function upsertProfileFromAuth(role: UserRole = 'employee') {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: authError?.message ?? 'Not authenticated' }

  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? '',
        display_name: user.user_metadata?.display_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
  if (error) return { error: error.message }
  return { error: null }
}
