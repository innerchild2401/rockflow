import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

/**
 * Supabase client for use in Server Components and Server Actions
 * Note: For production apps with authentication, consider using @supabase/ssr
 * for better cookie handling in the App Router
 */
export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey)
