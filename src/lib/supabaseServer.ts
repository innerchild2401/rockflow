import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'

/**
 * Supabase client for use in Server Components and Server Actions.
 * Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for real usage.
 */
export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey)
