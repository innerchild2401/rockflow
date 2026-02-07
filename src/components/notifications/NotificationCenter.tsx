'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNotificationsAction, markNotificationsReadAction, getUnreadNotificationCountAction } from '@/app/actions/task-collaboration'
import {
  getCompanyNotificationsAction,
  markCompanyNotificationsReadAction,
  getCompanyUnreadCountAction,
  type CompanyNotification,
} from '@/app/actions/company-notifications'
import { Button } from '@/components/ui/Button'

const APP_SCHEMA = 'app'

type TaskNotification = {
  id: string
  task_id: string
  type: 'mentioned' | 'assigned' | 'commented' | 'status_changed' | 'document_added' | 'due_date_changed'
  comment_id: string | null
  document_id: string | null
  actor_id: string | null
  read_at: string | null
  created_at: string
}

type NotificationItem = 
  | { kind: 'task'; data: TaskNotification }
  | { kind: 'company'; data: CompanyNotification }

export function NotificationCenter({ companyId, companySlug }: { companyId: string; companySlug: string }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [taskNotifications, setTaskNotifications] = useState<TaskNotification[]>([])
  const [companyNotifications, setCompanyNotifications] = useState<CompanyNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState<TaskNotification['type'] | 'member_joined' | 'all'>('all')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadNotifications()
    loadUnreadCount()

    const supabase = createClient()
    const channel = supabase
      .channel(`notifications:${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: APP_SCHEMA,
          table: 'task_notifications',
        },
        () => {
          loadNotifications()
          loadUnreadCount()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: APP_SCHEMA,
          table: 'company_notifications',
        },
        () => {
          loadNotifications()
          loadUnreadCount()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [companyId])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  async function loadNotifications() {
    setLoading(true)
    setLoadError(null)
    const [taskResult, companyResult] = await Promise.all([
      getNotificationsAction(companyId, 50),
      getCompanyNotificationsAction(companyId, 20),
    ])
    if (!taskResult.error) setTaskNotifications(taskResult.notifications as TaskNotification[])
    else if (taskResult.error) setLoadError(taskResult.error)
    if (!companyResult.error) setCompanyNotifications(companyResult.notifications)
    else if (companyResult.error) setLoadError(companyResult.error)
    setLoading(false)
  }

  async function loadUnreadCount() {
    const [taskCount, companyCount] = await Promise.all([
      getUnreadNotificationCountAction(companyId),
      getCompanyUnreadCountAction(companyId),
    ])
    setUnreadCount((taskCount ?? 0) + (companyCount ?? 0))
  }

  async function markAsRead(notificationIds: string[]) {
    await markNotificationsReadAction(notificationIds)
    await loadNotifications()
    await loadUnreadCount()
  }

  async function markCompanyAsRead(ids: string[]) {
    await markCompanyNotificationsReadAction(ids)
    await loadNotifications()
    await loadUnreadCount()
  }

  const companyItems: NotificationItem[] = companyNotifications.map((n) => ({ kind: 'company', data: n }))
  const taskItems: NotificationItem[] = taskNotifications.map((n) => ({ kind: 'task', data: n }))
  const allItems: NotificationItem[] = [...companyItems, ...taskItems].sort(
    (a, b) => new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime()
  )

  const filtered =
    filter === 'all'
      ? allItems
      : filter === 'member_joined'
        ? allItems.filter((i) => i.kind === 'company' && i.data.type === 'member_joined')
        : allItems.filter((i) => i.kind === 'task' && (i.data as TaskNotification).type === filter)

  const unread = filtered.filter((i) => !i.data.read_at)
  const read = filtered.filter((i) => i.data.read_at)
  const unreadTaskIds = unread.filter((i) => i.kind === 'task').map((i) => i.data.id)
  const unreadCompanyIds = unread.filter((i) => i.kind === 'company').map((i) => i.data.id)

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[360px] max-w-[90vw] rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900 sm:w-[420px]">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Notifications</h3>
              {unread.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (unreadTaskIds.length) markAsRead(unreadTaskIds)
                    if (unreadCompanyIds.length) markCompanyAsRead(unreadCompanyIds)
                  }}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
            <div className="mt-2 flex gap-1 overflow-x-auto">
              {(['all', 'member_joined', 'mentioned', 'commented', 'assigned', 'document_added'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded px-2 py-1 text-xs transition-colors ${
                    filter === f
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'member_joined' ? 'New member' : TASK_TYPE_LABELS[f]}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[480px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">Loading...</div>
            ) : loadError ? (
              <div className="px-4 py-8 text-center text-sm text-amber-600 dark:text-amber-400">
                Couldn&apos;t load notifications.{' '}
                {process.env.NODE_ENV === 'development' && <span className="block mt-1 text-xs">{loadError}</span>}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">No notifications</div>
            ) : (
              <>
                {unread.length > 0 && (
                  <div className="px-2 py-1">
                    {unread.map((item) => (
                      <NotificationRow
                        key={item.kind + item.data.id}
                        item={item}
                        companySlug={companySlug}
                        onMarkRead={() => {
                          if (item.kind === 'task') markAsRead([item.data.id])
                          else markCompanyAsRead([item.data.id])
                        }}
                        onNavigate={() => {
                          setIsOpen(false)
                          if (item.kind === 'task') router.push(`/dashboard/companies/${companySlug}/tasks/${(item.data as TaskNotification).task_id}`)
                          else router.push(`/dashboard/companies/${companySlug}/members`)
                        }}
                      />
                    ))}
                  </div>
                )}
                {read.length > 0 && unread.length > 0 && (
                  <div className="border-t border-zinc-200 px-2 py-1 dark:border-zinc-700">
                    <div className="px-2 py-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Older</div>
                  </div>
                )}
                {read.length > 0 && (
                  <div className="px-2 py-1">
                    {read.map((item) => (
                      <NotificationRow
                        key={item.kind + item.data.id}
                        item={item}
                        companySlug={companySlug}
                        onMarkRead={() => {
                          if (item.kind === 'task') markAsRead([item.data.id])
                          else markCompanyAsRead([item.data.id])
                        }}
                        onNavigate={() => {
                          setIsOpen(false)
                          if (item.kind === 'task') router.push(`/dashboard/companies/${companySlug}/tasks/${(item.data as TaskNotification).task_id}`)
                          else router.push(`/dashboard/companies/${companySlug}/members`)
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const TASK_TYPE_LABELS: Record<TaskNotification['type'], string> = {
  mentioned: 'Mentioned you',
  assigned: 'Assigned to you',
  commented: 'Commented',
  status_changed: 'Status changed',
  document_added: 'Document added',
  due_date_changed: 'Due date changed',
}

function NotificationRow({
  item,
  companySlug,
  onMarkRead,
  onNavigate,
}: {
  item: NotificationItem
  companySlug: string
  onMarkRead: () => void
  onNavigate: () => void
}) {
  const { data } = item
  const label =
    item.kind === 'company' && data.type === 'member_joined'
      ? `New member joined: ${(data.metadata as { new_member_name?: string })?.new_member_name ?? 'Someone'}. Review permissions.`
      : item.kind === 'task'
        ? TASK_TYPE_LABELS[(data as TaskNotification).type]
        : ''
  return (
    <button
      type="button"
      onClick={() => {
        if (!data.read_at) onMarkRead()
        onNavigate()
      }}
      className={`w-full rounded-lg p-3 text-left transition-colors ${
        data.read_at
          ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
          : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/50'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-50">{label}</span>
            {!data.read_at && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {new Date(data.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    </button>
  )
}
