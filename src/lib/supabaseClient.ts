import { createClient } from '@supabase/supabase-js'

// Use placeholders during build (e.g. Vercel) when env vars are not yet set.
// Runtime will use real values from environment.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'

/**
 * Supabase client for use in Client Components.
 * Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for real usage.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
