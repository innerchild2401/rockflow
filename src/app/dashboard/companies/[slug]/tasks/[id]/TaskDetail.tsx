'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateTaskAction, deleteTaskAction } from '@/app/actions/tasks'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DatePicker } from '@/components/ui/DatePicker'
import TaskWatchers from './TaskWatchers'
import type { TaskStatus } from '@/types/database'

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done', 'cancelled']
const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
  cancelled: 'Cancelled',
}
const STATUS_COLORS: Record<TaskStatus, string> = {
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

export default function TaskDetail(props: {
  companyId: string
  taskId: string
  slug: string
  initial: { title: string; description: string; status: string; due_date: string; assigned_to: string }
  members: { id: string; display_name: string | null; email: string }[]
  canEdit: boolean
  canDelete: boolean
  availableDocuments?: { id: string; title: string; file_name: string | null }[]
}) {
  const { companyId, taskId, slug, initial, members, canEdit, canDelete, availableDocuments = [] } = props
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)
  const [status, setStatus] = useState<TaskStatus>(initial.status as TaskStatus)
  const [dueDate, setDueDate] = useState(initial.due_date)
  const [assignedTo, setAssignedTo] = useState(initial.assigned_to)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusChanging, setStatusChanging] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const urgency = getUrgency(dueDate || null)
  const assignee = assignedTo ? members.find((m) => m.id === assignedTo) : null
  const assigneeLabel = assignee ? assignee.display_name || assignee.email : null

  async function onStatusChange(newStatus: TaskStatus) {
    if (newStatus === status || !canEdit) return
    setStatusChanging(true)
    setError(null)
    const r = await updateTaskAction(companyId, taskId, { status: newStatus })
    setStatusChanging(false)
    if (r?.error) setError(r.error)
    else {
      setStatus(newStatus)
      router.refresh()
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    setLoading(true)
    setError(null)
    const r = await updateTaskAction(companyId, taskId, {
      title,
      description,
      status,
      due_date: dueDate || null,
      assigned_to: assignedTo || null,
    })
    setLoading(false)
    if (r?.error) setError(r.error)
    else {
      setIsEditing(false)
      router.refresh()
    }
  }

  async function onDelete() {
    if (!canDelete || !confirm('Delete this task? All comments will be removed.')) return
    const r = await deleteTaskAction(companyId, taskId)
    if (r?.error) alert(r.error)
    else {
      router.push(`/dashboard/companies/${slug}/tasks`)
      router.refresh()
    }
  }

  if (!canEdit) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge className={STATUS_COLORS[status as TaskStatus]}>{STATUS_LABELS[status as TaskStatus]}</Badge>
          {urgency && <Badge className={urgency.color}>{urgency.label}</Badge>}
          {dueDate && <span className="text-sm text-zinc-600 dark:text-zinc-400">Due {new Date(dueDate).toLocaleDateString()}</span>}
          {assigneeLabel && <span className="text-sm text-zinc-600 dark:text-zinc-400">Assigned to {assigneeLabel}</span>}
        </div>
        {description && <div className="mt-4 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{description}</div>}
      </div>
    )
  }

  if (isEditing) {
    return (
      <form onSubmit={onSave} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50">
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Due date</label>
            <DatePicker value={dueDate} onChange={setDueDate} minDate={today} className="mt-1" />
          </div>
        </div>
        {members.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Assign to</label>
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50">
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.display_name || m.email}</option>)}
            </select>
          </div>
        )}
        <div className="flex gap-3">
          <Button type="submit" disabled={loading} isLoading={loading}>Save</Button>
          <Button type="button" variant="outline" onClick={() => { setIsEditing(false); setError(null); }}>Cancel</Button>
          {canDelete && (
            <Button type="button" variant="danger" onClick={onDelete}>Delete task</Button>
          )}
        </div>
      </form>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 sm:text-xl">Task Details</h2>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Status</label>
            {canEdit ? (
              <select
                value={status}
                onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
                disabled={statusChanging}
                className={`mt-1 w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm font-medium ${STATUS_COLORS[status]} cursor-pointer transition-colors hover:opacity-80 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900`}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            ) : (
              <Badge className={`mt-1 ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status as TaskStatus]}</Badge>
            )}
          </div>

          {urgency && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Urgency</label>
              <Badge className={`mt-1 ${urgency.color}`}>{urgency.label}</Badge>
            </div>
          )}

          {dueDate && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Due Date</label>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">{new Date(dueDate).toLocaleDateString()}</p>
            </div>
          )}

          {assigneeLabel && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Assigned To</label>
              <Badge className="mt-1 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{assigneeLabel}</Badge>
            </div>
          )}

          {description && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Description</label>
              <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{description}</div>
            </div>
          )}

          <TaskWatchers companyId={companyId} taskId={taskId} />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">{error}</div>
        )}

        {canDelete && (
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <Button variant="danger" size="sm" onClick={onDelete} className="w-full">
              Delete Task
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
