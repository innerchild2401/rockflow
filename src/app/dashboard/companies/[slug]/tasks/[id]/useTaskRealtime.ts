'use client'

import { useEffect, useRef, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

const APP_SCHEMA = 'app'

type RealtimePayload = { new?: { user_id?: string }; old?: unknown }

/**
 * Hook to subscribe to real-time updates for a task (comments and attachments).
 * Skips refresh for the current user's own comment inserts so the chat stays fluid.
 */
export function useTaskRealtime(taskId: string, enabled = true, currentUserId: string | null = null) {
  const router = useRouter()
  const channelRef = useRef<RealtimeChannel | null>(null)

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
        (payload: RealtimePayload) => {
          // Don't refresh for our own insert – message is already shown optimistically
          if (
            payload.new?.user_id &&
            currentUserId &&
            payload.new.user_id === currentUserId
          ) {
            return
          }
          startTransition(() => router.refresh())
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
          startTransition(() => router.refresh())
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [taskId, enabled, currentUserId, router])
}
