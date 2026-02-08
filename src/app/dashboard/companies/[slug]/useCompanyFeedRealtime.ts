'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

const APP_SCHEMA = 'app'

type RealtimePayload = { new?: { user_id?: string }; old?: unknown }

/**
 * Subscribe to company feed inserts. When someone else posts, call onNewPost
 * so the feed can silent-refetch and show the new post (no loading, no router.refresh).
 */
export function useCompanyFeedRealtime(
  companyId: string,
  enabled: boolean,
  currentUserId: string | null,
  onNewPost: () => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onNewPostRef = useRef(onNewPost)
  onNewPostRef.current = onNewPost

  useEffect(() => {
    if (!enabled || !companyId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`company_feed:${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: APP_SCHEMA,
          table: 'company_feed',
          filter: `company_id=eq.${companyId}`,
        },
        (payload: RealtimePayload) => {
          if (payload.new?.user_id && currentUserId && payload.new.user_id === currentUserId) return
          onNewPostRef.current()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [companyId, enabled, currentUserId])
}
