'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'

const STATUS_LABELS: Record<string, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
  cancelled: 'Cancelled',
}

const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

function getUrgency(dueDate: string | null): { label: string; color: string } | null {
  if (!dueDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { label: 'Overdue', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }
  if (diffDays === 0) return { label: 'Due today', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' }
  if (diffDays <= 3) return { label: 'Due soon', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' }
  return null
}

export default function TasksList({
  slug,
  tasks,
  memberNames,
  taskNewCounts = {},
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
  taskNewCounts?: Record<string, number>
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
          <div key={status} className="px-4 py-3">
            <p className="mb-2 text-xs font-medium uppercase text-zinc-400 dark:text-zinc-500">
              {STATUS_LABELS[status] ?? status}
            </p>
            <ul className="space-y-1">
              {list.map((t) => {
                const urgency = getUrgency(t.due_date)
                return (
                  <li key={t.id}>
                    <Link
                      href={`/dashboard/companies/${slug}/tasks/${t.id}`}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <span className="min-w-0 flex-1 font-medium text-zinc-900 dark:text-zinc-50">{t.title}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        {(taskNewCounts[t.id] ?? 0) > 0 && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-teal-600 px-1.5 text-xs font-medium text-white dark:bg-teal-500">
                            {taskNewCounts[t.id]! > 99 ? '99+' : taskNewCounts[t.id]}
                          </span>
                        )}
                        {urgency && (
                          <Badge className={urgency.color} size="sm">
                            {urgency.label}
                          </Badge>
                        )}
                        {t.due_date && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {formatDate(t.due_date)}
                          </span>
                        )}
                        {t.assigned_to && memberNames[t.assigned_to] && (
                          <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" size="sm">
                            {memberNames[t.assigned_to]}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
      {tasks.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No tasks yet. Create your first task to get started.
        </div>
      )}
    </div>
  )
}
