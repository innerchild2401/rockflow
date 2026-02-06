'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getGoogleCalendarSyncAction, disableGoogleCalendarSyncAction, syncTaskToGoogleCalendarAction } from '@/app/actions/google-calendar'
import { Button } from '@/components/ui/Button'

export default function GoogleCalendarSync({
  companyId,
  slug,
}: {
  companyId: string
  slug: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [syncStatus, setSyncStatus] = useState<{ enabled: boolean; loading: boolean } | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    loadSyncStatus()
    
    // Check for success/error messages from OAuth callback
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    if (success) {
      loadSyncStatus()
      // Clear URL params
      router.replace(`/dashboard/companies/${slug}/tasks/calendar`)
    }
    if (error) {
      console.error('Google Calendar sync error:', error)
    }
  }, [searchParams, slug, router])

  async function loadSyncStatus() {
    const result = await getGoogleCalendarSyncAction(companyId)
    if (!result.error && result.sync) {
      setSyncStatus({ enabled: result.sync.sync_enabled, loading: false })
    } else {
      setSyncStatus({ enabled: false, loading: false })
    }
  }

  function handleConnect() {
    window.location.href = `/api/google-calendar/auth?company_id=${companyId}`
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Google Calendar sync? Tasks will no longer sync automatically.')) return
    setSyncStatus({ enabled: false, loading: true })
    await disableGoogleCalendarSyncAction(companyId)
    await loadSyncStatus()
  }

  async function handleSyncAll() {
    setSyncing(true)
    // In a real implementation, you'd sync all tasks with due dates
    // For now, just show a message
    alert('Sync all functionality coming soon. Individual tasks will sync automatically when created or updated.')
    setSyncing(false)
  }

  if (syncStatus === null) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Google Calendar Sync</h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Google Calendar Sync</h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {syncStatus.enabled
              ? 'Tasks with due dates will automatically sync to your Google Calendar.'
              : 'Connect your Google Calendar to sync tasks automatically.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncStatus.enabled ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncAll}
                disabled={syncing}
              >
                {syncing ? 'Syncing...' : 'Sync All'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={syncStatus.loading}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={syncStatus.loading}
            >
              Connect Google Calendar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
