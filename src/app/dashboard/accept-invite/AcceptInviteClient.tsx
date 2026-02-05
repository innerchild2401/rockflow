'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptInviteAction } from '@/app/actions/invites'

export default function AcceptInviteClient({ token }: { token: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'accepting' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setStatus('accepting')
      const r = await acceptInviteAction(token)
      if (!mounted) return
      if (r.error) {
        setMessage(r.error)
        setStatus('error')
        return
      }
      setStatus('done')
      router.replace(r.slug ? `/dashboard/companies/${r.slug}` : '/dashboard')
      router.refresh()
    })()
    return () => { mounted = false }
  }, [token, router])

  if (status === 'accepting') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <p className="text-zinc-600 dark:text-zinc-400">Joining company…</p>
      </div>
    )
  }
  if (status === 'error' && message) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <p className="text-red-600 dark:text-red-400">{message}</p>
      </div>
    )
  }
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <p className="text-zinc-600 dark:text-zinc-400">Redirecting…</p>
    </div>
  )
}
