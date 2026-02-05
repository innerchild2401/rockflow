'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createInviteAction } from '@/app/actions/invites'

export default function InviteForm({ companyId, slug }: { companyId: string; slug: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setLink(null)
    const r = await createInviteAction(companyId, email)
    setLoading(false)
    if (r.error) setError(r.error)
    else if (r.token) setLink(`${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/accept-invite?token=${r.token}`)
    setEmail('')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-end gap-3">
      {error && <div className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">{error}</div>}
      {link && <div className="w-full rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/50 dark:text-green-200">Invite sent. Share: <code className="mt-1 block break-all font-mono text-xs">{link}</code></div>}
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50" />
      <button type="submit" disabled={loading} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">{loading ? 'Sending…' : 'Send invite'}</button>
    </form>
  )
}
