'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

/**
 * Example component showing how to use the Supabase client
 * This demonstrates common patterns for fetching data in Client Components
 */
export function SupabaseExample() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>(
    'loading'
  )
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    async function checkConnection() {
      try {
        // Example: Check authentication status
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) throw error

        setStatus('connected')
        setMessage(
          session
            ? 'Connected and authenticated!'
            : 'Connected! (Not authenticated)'
        )
      } catch (err) {
        setStatus('error')
        setMessage(
          err instanceof Error ? err.message : 'Failed to connect to Supabase'
        )
      }
    }

    checkConnection()
  }, [])

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-2 font-semibold">Supabase Status:</h3>
      <div className="flex items-center gap-2">
        <div
          className={`h-3 w-3 rounded-full ${
            status === 'loading'
              ? 'bg-yellow-500'
              : status === 'connected'
                ? 'bg-green-500'
                : 'bg-red-500'
          }`}
        />
        <span className="text-sm">{message || 'Checking...'}</span>
      </div>
    </div>
  )
}
