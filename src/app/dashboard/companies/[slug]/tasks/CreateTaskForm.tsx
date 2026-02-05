'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTaskAction } from '@/app/actions/tasks'
import type { TaskStatus } from '@/types/database'

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done', 'cancelled']

export default function CreateTaskForm(props: {
  companyId: string
  slug: string
  members: { id: string; display_name: string | null; email: string }[]
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const r = await createTaskAction(props.companyId, {
      title,
      description: description || undefined,
      status,
      due_date: dueDate || null,
      assigned_to: assignedTo || null,
    })
    setLoading(false)
    if (r.error) setError(r.error)
    else if (r.id) {
      router.push(`/dashboard/companies/${props.slug}/tasks/${r.id}`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          required
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={3}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>
      {props.members.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Assign to</label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Unassigned</option>
            {props.members.map((m) => (
              <option key={m.id} value={m.id}>{m.display_name || m.email}</option>
            ))}
          </select>
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {loading ? 'Creating…' : 'Create task'}
      </button>
    </form>
  )
}
