'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateTaskAction, deleteTaskAction } from '@/app/actions/tasks'
import type { TaskStatus } from '@/types/database'

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done', 'cancelled']

export default function TaskDetail(props: {
  companyId: string
  taskId: string
  slug: string
  initial: { title: string; description: string; status: string; due_date: string; assigned_to: string }
  members: { id: string; display_name: string | null; email: string }[]
  canEdit: boolean
  canDelete: boolean
}) {
  const { companyId, taskId, slug, initial, members, canEdit, canDelete } = props
  const router = useRouter()
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)
  const [status, setStatus] = useState<TaskStatus>(initial.status as TaskStatus)
  const [dueDate, setDueDate] = useState(initial.due_date)
  const [assignedTo, setAssignedTo] = useState(initial.assigned_to)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    else router.refresh()
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

  const assigneeLabel = assignedTo && members.find((m) => m.id === assignedTo)
    ? (members.find((m) => m.id === assignedTo)!.display_name || members.find((m) => m.id === assignedTo)!.email)
    : null

  if (!canEdit) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
        {(description || assigneeLabel || dueDate || status) && (
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="rounded bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">{status.replace('_', ' ')}</span>
            {dueDate && <span>Due {new Date(dueDate).toLocaleDateString()}</span>}
            {assigneeLabel && <span>Assigned to {assigneeLabel}</span>}
          </div>
        )}
        {description && <div className="mt-3 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{description}</div>}
      </div>
    )
  }

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
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Due date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50" />
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
        <button type="submit" disabled={loading} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">Save</button>
        {canDelete && (
          <button type="button" onClick={onDelete} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/50">Delete task</button>
        )}
      </div>
    </form>
  )
}
