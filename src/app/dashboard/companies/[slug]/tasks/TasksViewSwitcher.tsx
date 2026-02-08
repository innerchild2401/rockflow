'use client'

import { useState } from 'react'
import TasksList from './TasksList'
import TasksKanban from './TasksKanban'
import TasksSearch from './TasksSearch'

type View = 'list' | 'kanban' | 'search'

export default function TasksViewSwitcher({
  companyId,
  slug,
  tasks,
  memberNames,
  members,
  canEdit,
  taskNewCounts,
}: {
  companyId: string
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
  members: { id: string; display_name: string | null; email: string }[]
  canEdit: boolean
  taskNewCounts: Record<string, number>
}) {
  const [view, setView] = useState<View>('list')

  return (
    <>
      <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
        <div className="flex items-center gap-1">
          {(['list', 'kanban', 'search'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                view === v
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-transparent text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {view === 'list' && <TasksList slug={slug} tasks={tasks} memberNames={memberNames} taskNewCounts={taskNewCounts} />}
      {view === 'kanban' && (
        <TasksKanban companyId={companyId} slug={slug} tasks={tasks} memberNames={memberNames} canEdit={canEdit} taskNewCounts={taskNewCounts} />
      )}
      {view === 'search' && <TasksSearch slug={slug} tasks={tasks} memberNames={memberNames} members={members} taskNewCounts={taskNewCounts} />}
    </>
  )
}
