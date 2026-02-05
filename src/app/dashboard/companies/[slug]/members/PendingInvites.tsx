'use client'

type Invite = { id: string; email: string; expires_at: string; created_at: string }

export default function PendingInvites({ invites, slug }: { invites: Invite[]; slug: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Pending invites</h2>
      <ul className="mt-4 space-y-2">
        {invites.map((inv) => (
          <li
            key={inv.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-2 dark:border-zinc-700"
          >
            <span className="text-sm text-zinc-700 dark:text-zinc-300">{inv.email}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Expires {new Date(inv.expires_at).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
