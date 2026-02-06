'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { watchTaskAction, unwatchTaskAction, isWatchingTaskAction, getTaskWatchersAction } from '@/app/actions/task-collaboration'
import { Button } from '@/components/ui/Button'

export default function TaskWatchers({
  companyId,
  taskId,
}: {
  companyId: string
  taskId: string
}) {
  const router = useRouter()
  const [isWatching, setIsWatching] = useState(false)
  const [watchers, setWatchers] = useState<{ id: string; display_name: string | null; email: string }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadWatchers()
    checkWatching()
  }, [companyId, taskId])

  async function loadWatchers() {
    const result = await getTaskWatchersAction(companyId, taskId)
    if (!result.error) {
      setWatchers(result.watchers as { id: string; display_name: string | null; email: string }[])
    }
  }

  async function checkWatching() {
    const watching = await isWatchingTaskAction(companyId, taskId)
    setIsWatching(watching)
  }

  async function toggleWatch() {
    setLoading(true)
    if (isWatching) {
      const r = await unwatchTaskAction(companyId, taskId)
      if (!r.error) setIsWatching(false)
    } else {
      const r = await watchTaskAction(companyId, taskId)
      if (!r.error) setIsWatching(true)
    }
    await loadWatchers()
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">Watchers</label>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleWatch}
          disabled={loading}
          className="text-xs"
        >
          {isWatching ? 'Unwatch' : 'Watch'}
        </Button>
      </div>
      {watchers.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {watchers.map((w) => (
            <span
              key={w.id}
              className="inline-flex items-center rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {w.display_name || w.email}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">No watchers</p>
      )}
    </div>
  )
}
