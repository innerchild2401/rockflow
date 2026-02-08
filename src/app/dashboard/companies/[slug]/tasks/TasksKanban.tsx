'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateTaskAction } from '@/app/actions/tasks'
import { Badge } from '@/components/ui/Badge'
import type { TaskStatus } from '@/types/database'

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

type Task = {
  id: string
  title: string
  status: string
  due_date: string | null
  assigned_to: string | null
  updated_at: string
}

export default function TasksKanban({
  companyId,
  slug,
  tasks,
  memberNames,
  canEdit,
  taskNewCounts = {},
}: {
  companyId: string
  slug: string
  tasks: Task[]
  memberNames: Record<string, string>
  canEdit: boolean
  taskNewCounts?: Record<string, number>
}) {
  const router = useRouter()
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [targetStatus, setTargetStatus] = useState<string | null>(null)

  const columns: string[] = ['todo', 'in_progress', 'done', 'cancelled']
  const tasksByStatus = columns.reduce((acc, status) => {
    acc[status] = tasks.filter((t) => t.status === status)
    return acc
  }, {} as Record<string, Task[]>)

  async function handleDrop(status: string) {
    if (!draggedTask || !canEdit) return
    await updateTaskAction(companyId, draggedTask, { status: status as TaskStatus })
    setDraggedTask(null)
    setTargetStatus(null)
    router.refresh()
  }

  function handleDragStart(taskId: string) {
    if (!canEdit) return
    setDraggedTask(taskId)
  }

  function handleDragOver(e: React.DragEvent, status: string) {
    if (!canEdit) return
    e.preventDefault()
    setTargetStatus(status)
  }

  function handleDragLeave() {
    setTargetStatus(null)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((status) => {
        const columnTasks = tasksByStatus[status]
        const isTarget = targetStatus === status
        return (
          <div
            key={status}
            className={`flex min-w-[280px] flex-col rounded-lg border-2 transition-colors ${
              isTarget
                ? 'border-blue-400 bg-blue-50/50 dark:border-blue-600 dark:bg-blue-950/20'
                : 'border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50'
            }`}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(status)}
          >
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {STATUS_LABELS[status]}
                </h3>
                    <Badge className={STATUS_COLORS[status] || STATUS_COLORS.todo} size="sm">
                  {columnTasks.length}
                </Badge>
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {columnTasks.map((task) => {
                const urgency = getUrgency(task.due_date)
                const isDragging = draggedTask === task.id
                return (
                  <div
                    key={task.id}
                    draggable={canEdit}
                    onDragStart={() => handleDragStart(task.id)}
                    className={`group rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-all hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 ${
                      isDragging ? 'opacity-50' : 'cursor-move'
                    }`}
                  >
                    <Link
                      href={`/dashboard/companies/${slug}/tasks/${task.id}`}
                      className="block"
                      onClick={(e) => {
                        if (isDragging) e.preventDefault()
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="min-w-0 flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {task.title}
                        </h4>
                        {(taskNewCounts[task.id] ?? 0) > 0 && (
                          <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-teal-600 px-1.5 text-xs font-medium text-white dark:bg-teal-500">
                            {taskNewCounts[task.id]! > 99 ? '99+' : taskNewCounts[task.id]}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {urgency && (
                          <Badge className={urgency.color} size="sm">
                            {urgency.label}
                          </Badge>
                        )}
                        {task.due_date && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {task.assigned_to && memberNames[task.assigned_to] && (
                          <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" size="sm">
                            {memberNames[task.assigned_to]}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  </div>
                )
              })}
              {columnTasks.length === 0 && (
                <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                  No tasks
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
