'use client'

import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
  cancelled: 'Cancelled',
}

export default function TasksList({
  slug,
  tasks,
  memberNames,
}: {
  slug: string
  tasks: {
    id: string
    title: string
    status: string
    due_date: string | null
    assigned_to: string | null
    updated_at: string
  }[]
  memberNames: Record<string, string>
}) {
  const formatDate = (s: string) => new Date(s).toLocaleDateString()
  const byStatus = (status: string) => tasks.filter((t) => t.status === status)
  const order: string[] = ['todo', 'in_progress', 'done', 'cancelled']

  return (
    <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
      {order.map((status) => {
        const list = byStatus(status)
        if (list.length === 0) return null
        return (
          <div key={status} className="px-6 py-4">
            <p className="mb-2 text-xs font-medium uppercase text-zinc-400 dark:text-zinc-500">
              {STATUS_LABELS[status] ?? status}
            </p>
            <ul className="space-y-1">
              {list.map((t) => (
                <li key={t.id} className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/companies/${slug}/tasks/${t.id}`}
                    className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                  >
                    {t.title}
                  </Link>
                  {t.due_date && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Due {formatDate(t.due_date)}
                    </span>
                  )}
                  {t.assigned_to && memberNames[t.assigned_to] && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {memberNames[t.assigned_to]}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      {tasks.length === 0 && (
        <div className="px-6 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No tasks yet.
        </div>
      )}
    </div>
  )
}
