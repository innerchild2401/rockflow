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
  const [copied, setCopied] = useState(false)

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

  async function copyLink() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="invite-email" className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Invitee email (link will be tied to this address)
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            required
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <button type="submit" disabled={loading} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
          {loading ? 'Generating…' : 'Generate invite link'}
        </button>
      </form>
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">{error}</div>}
      {link && (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Invite link</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 break-all rounded bg-white px-2 py-1.5 font-mono text-xs dark:bg-zinc-800">{link}</code>
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="font-medium">Instructions</p>
            <ol className="mt-1 list-inside list-decimal space-y-0.5 text-amber-800 dark:text-amber-300">
              <li>Share this link with the person you want to invite (e.g. by chat or in person).</li>
              <li>They must sign up or log in with the <strong>same email</strong> you entered above.</li>
              <li>After signing in, they open the link to join this company.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}
