'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

/**
 * Example page demonstrating Supabase client usage
 * This is a Client Component (uses 'use client' directive)
 */
export default function ExamplePage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Example: Fetch data from Supabase
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // Example query - replace 'your_table' with your actual table name
        // const { data, error } = await supabase
        //   .from('your_table')
        //   .select('*')
        //   .limit(10)

        // For demonstration, we'll just check the connection
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        // Set some example data
        setData([
          {
            message: 'Supabase client is connected!',
            session: sessionData.session ? 'Authenticated' : 'Not authenticated',
          },
        ])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg bg-red-50 p-4 text-red-800">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">Supabase Example</h1>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Connection Status</h2>
          <pre className="overflow-auto rounded bg-gray-50 p-4 text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h3 className="mb-2 font-semibold text-blue-900">
            Usage Examples:
          </h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-blue-800">
            <li>
              <code className="rounded bg-blue-100 px-1">
                supabase.from('table').select('*')
              </code>{' '}
              - Fetch data
            </li>
            <li>
              <code className="rounded bg-blue-100 px-1">
                supabase.auth.signInWithPassword()
              </code>{' '}
              - User authentication
            </li>
            <li>
              <code className="rounded bg-blue-100 px-1">
                supabase.auth.signUp()
              </code>{' '}
              - User registration
            </li>
            <li>
              <code className="rounded bg-blue-100 px-1">
                supabase.storage.from('bucket').list()
              </code>{' '}
              - File storage
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
