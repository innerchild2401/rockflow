'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MyInvite } from '@/app/actions/invites'
import { acceptInviteByIdAction, refuseInviteAction, ignoreInviteAction } from '@/app/actions/invites'
import { Button } from '@/components/ui/Button'

export default function InvitesInboxClient({ initialInvites }: { initialInvites: MyInvite[] }) {
  const router = useRouter()
  const [invites, setInvites] = useState<MyInvite[]>(initialInvites)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept(inviteId: string) {
    setError(null)
    setLoadingId(inviteId)
    const r = await acceptInviteByIdAction(inviteId)
    setLoadingId(null)
    if (r.error) {
      setError(r.error)
      return
    }
    setInvites((prev) => prev.filter((i) => i.id !== inviteId))
    router.refresh()
    if (r.slug) router.replace(`/dashboard/companies/${r.slug}`)
  }

  async function handleRefuse(inviteId: string) {
    setError(null)
    setLoadingId(inviteId)
    const r = await refuseInviteAction(inviteId)
    setLoadingId(null)
    if (r.error) {
      setError(r.error)
      return
    }
    setInvites((prev) => prev.filter((i) => i.id !== inviteId))
    router.refresh()
  }

  async function handleIgnore(inviteId: string) {
    setError(null)
    setLoadingId(inviteId)
    const r = await ignoreInviteAction(inviteId)
    setLoadingId(null)
    if (r.error) {
      setError(r.error)
      return
    }
    setInvites((prev) => prev.filter((i) => i.id !== inviteId))
    router.refresh()
  }

  if (invites.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No pending invitations. When a company invites you by email, it will appear here.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </div>
      )}
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
        {invites.map((inv) => (
          <li key={inv.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">{inv.company_name}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Invited by {inv.inviter_name} · Expires {new Date(inv.expires_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                disabled={loadingId !== null}
                isLoading={loadingId === inv.id}
                onClick={() => handleAccept(inv.id)}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={loadingId !== null}
                onClick={() => handleIgnore(inv.id)}
              >
                Ignore
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loadingId !== null}
                onClick={() => handleRefuse(inv.id)}
              >
                Refuse
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
