'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'

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

type Task = {
  id: string
  title: string
  status: string
  due_date: string | null
  assigned_to: string | null
  updated_at: string
}

export default function TasksCalendar({
  slug,
  tasks,
  memberNames,
}: {
  slug: string
  tasks: Task[]
  memberNames: Record<string, string>
}) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  // Group tasks by due date
  const tasksByDate = tasks.reduce((acc, task) => {
    if (!task.due_date) return acc
    const dateKey = task.due_date
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  function goToPreviousMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  function goToNextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const today = new Date()
  const isToday = (day: number) => {
    const date = new Date(year, month, day)
    return date.toDateString() === today.toDateString()
  }

  // Get tasks without due dates
  const tasksWithoutDate = tasks.filter((t) => !t.due_date)

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="rounded p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Previous month"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 min-w-[200px] text-center">
            {monthNames[month]} {year}
          </h2>
          <button
            type="button"
            onClick={goToNextMonth}
            className="rounded p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Next month"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          onClick={goToToday}
          className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-700">
          {dayNames.map((day) => (
            <div
              key={day}
              className="border-r border-zinc-200 px-2 py-2 text-center text-xs font-medium text-zinc-500 last:border-r-0 dark:border-zinc-700 dark:text-zinc-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[100px] border-b border-r border-zinc-200 dark:border-zinc-700"
            />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayTasks = tasksByDate[dateKey] || []
            const isCurrentDay = isToday(day)

            return (
              <div
                key={day}
                className={`min-h-[100px] border-b border-r border-zinc-200 p-2 last:border-r-0 dark:border-zinc-700 ${
                  isCurrentDay ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                }`}
              >
                <div className={`mb-1 text-xs font-medium ${isCurrentDay ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                  {day}
                </div>
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map((task) => {
                    const urgency = getUrgency(task.due_date)
                    const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS.todo
                    return (
                      <Link
                        key={task.id}
                        href={`/dashboard/companies/${slug}/tasks/${task.id}`}
                        className={`block truncate rounded px-1.5 py-0.5 text-xs hover:opacity-80 ${urgency ? urgency.color : statusColor}`}
                      >
                        {task.title}
                      </Link>
                    )
                  })}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tasks without due dates */}
      {tasksWithoutDate.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Tasks without due date ({tasksWithoutDate.length})
          </h3>
          <div className="space-y-2">
            {tasksWithoutDate.map((task) => (
              <Link
                key={task.id}
                href={`/dashboard/companies/${slug}/tasks/${task.id}`}
                className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{task.title}</span>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[task.status]} size="sm">
                    {task.status.replace('_', ' ')}
                  </Badge>
                  {task.assigned_to && memberNames[task.assigned_to] && (
                    <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" size="sm">
                      {memberNames[task.assigned_to]}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
