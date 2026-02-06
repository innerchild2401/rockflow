'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const APP_SCHEMA = 'app'

/**
 * Hook to subscribe to real-time updates for a task (comments and attachments).
 */
export function useTaskRealtime(taskId: string, enabled = true) {
  const router = useRouter()
  const channelRef = useRef<ReturnType<typeof createClient>['channel'] | null>(null)

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    const channel = supabase
      .channel(`task:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: APP_SCHEMA,
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          // Refresh the page to get latest comments
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: APP_SCHEMA,
          table: 'task_attachments',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          // Refresh the page to get latest attachments
          router.refresh()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [taskId, enabled, router])
}
