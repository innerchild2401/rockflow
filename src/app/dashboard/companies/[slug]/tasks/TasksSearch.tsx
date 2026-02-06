'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'

const STATUS_LABELS: Record<string, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
  cancelled: 'Cancelled',
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

type Task = {
  id: string
  title: string
  status: string
  due_date: string | null
  assigned_to: string | null
  updated_at: string
}

export default function TasksSearch({
  slug,
  tasks,
  memberNames,
  members,
}: {
  slug: string
  tasks: Task[]
  memberNames: Record<string, string>
  members: { id: string; display_name: string | null; email: string }[]
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [dueDateFilter, setDueDateFilter] = useState<string>('all')

  const filtered = tasks.filter((task) => {
    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchesTitle = task.title.toLowerCase().includes(query)
      const matchesAssignee = task.assigned_to && memberNames[task.assigned_to]?.toLowerCase().includes(query)
      if (!matchesTitle && !matchesAssignee) return false
    }

    // Status filter
    if (statusFilter !== 'all' && task.status !== statusFilter) return false

    // Assignee filter
    if (assigneeFilter !== 'all' && task.assigned_to !== assigneeFilter) {
      if (assigneeFilter === 'unassigned' && task.assigned_to) return false
      if (assigneeFilter !== 'unassigned' && task.assigned_to !== assigneeFilter) return false
    }

    // Due date filter
    if (dueDateFilter !== 'all') {
      if (!task.due_date) {
        if (dueDateFilter !== 'no_date') return false
      } else {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const due = new Date(task.due_date + 'T00:00:00')
        const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        if (dueDateFilter === 'overdue' && diffDays >= 0) return false
        if (dueDateFilter === 'today' && diffDays !== 0) return false
        if (dueDateFilter === 'this_week' && (diffDays < 0 || diffDays > 7)) return false
        if (dueDateFilter === 'upcoming' && diffDays <= 7) return false
      }
    }

    return true
  })

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by title or assignee…"
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="all">All statuses</option>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Assignee</label>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="all">Everyone</option>
              <option value="unassigned">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name || m.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Due Date</label>
            <select
              value={dueDateFilter}
              onChange={(e) => setDueDateFilter(e.target.value)}
              className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="all">All dates</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due today</option>
              <option value="this_week">This week</option>
              <option value="upcoming">Upcoming</option>
              <option value="no_date">No due date</option>
            </select>
          </div>
        </div>
        {(searchQuery || statusFilter !== 'all' || assigneeFilter !== 'all' || dueDateFilter !== 'all') && (
          <div className="flex items-center justify-between border-t border-zinc-200 pt-2 dark:border-zinc-700">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {filtered.length} task{filtered.length !== 1 ? 's' : ''} found
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setAssigneeFilter('all')
                setDueDateFilter('all')
              }}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No tasks match your filters.
          </div>
        ) : (
          filtered.map((task) => {
            const urgency = getUrgency(task.due_date)
            return (
              <Link
                key={task.id}
                href={`/dashboard/companies/${slug}/tasks/${task.id}`}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">{task.title}</span>
                    <Badge className={STATUS_COLORS[task.status]} size="sm">
                      {STATUS_LABELS[task.status]}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {urgency && (
                      <Badge className={urgency.color} size="sm">
                        {urgency.label}
                      </Badge>
                    )}
                    {task.due_date && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Due {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {task.assigned_to && memberNames[task.assigned_to] && (
                      <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" size="sm">
                        {memberNames[task.assigned_to]}
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}
