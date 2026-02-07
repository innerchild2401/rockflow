'use client'

import { useEffect, useRef } from 'react'
import { useToast } from '@/lib/toast'
import { ToastContainer } from '@/components/ui/Toast'

const SESSION_KEY = 'rockflow-invites-toast-shown'

export function PendingInvitesToast({ pendingInviteCount }: { pendingInviteCount: number }) {
  const { toasts, addToast, removeToast } = useToast()
  const shownRef = useRef(false)

  useEffect(() => {
    if (pendingInviteCount <= 0 || shownRef.current) return
    if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY)) return

    shownRef.current = true
    if (typeof window !== 'undefined') sessionStorage.setItem(SESSION_KEY, '1')
    const msg =
      pendingInviteCount === 1
        ? 'You have 1 pending invitation.'
        : `You have ${pendingInviteCount} pending invitations.`
    addToast(msg, 'info', 8000)
  }, [pendingInviteCount, addToast])

  if (toasts.length === 0) return null
  return <ToastContainer toasts={toasts} onRemove={removeToast} />
}
