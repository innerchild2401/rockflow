'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createTaskCommentAction } from '@/app/actions/tasks'
import { attachDocumentToTaskAction, detachDocumentFromTaskAction } from '@/app/actions/task-collaboration'
import { setTaskChatReadAction } from '@/app/actions/chat-read'
import { getMentionSuggestions } from '@/lib/parse-mentions'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { SendIcon } from '@/components/ui/SendIcon'
import { useToast } from '@/lib/toast'
import { ToastContainer } from '@/components/ui/Toast'
import { useTaskRealtime } from './useTaskRealtime'
import { CommentWithReactions } from './CommentWithReactions'
import AttachDocumentMenu from './AttachDocumentMenu'

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

type CommentNode = {
  id: string
  user_id: string
  body: string
  created_at: string
  updated_at: string
  author: string
  replies?: CommentNode[]
}

type Document = {
  id: string
  title: string
  file_name: string | null
  attached_by?: string
  attached_at?: string | null
}

export default function TaskChat({
  companyId,
  taskId,
  slug,
  taskTitle,
  taskStatus,
  taskDueDate,
  taskAssignedTo,
  taskAssigneeName,
  comments,
  attachments,
  members,
  availableDocuments,
  currentUserId,
  canEdit,
  readAt,
  variant,
}: {
  companyId: string
  taskId: string
  slug: string
  taskTitle: string
  taskStatus: string
  taskDueDate: string | null
  taskAssignedTo: string | null
  taskAssigneeName: string | null
  comments: CommentNode[]
  attachments: Document[]
  members: { id: string; email: string; display_name: string | null }[]
  availableDocuments: Document[]
  currentUserId: string | null
  canEdit: boolean
  readAt: string | null
  variant?: 'full' | 'chatOnly'
}) {
  const isChatOnly = variant === 'chatOnly'
  const router = useRouter()
  const [effectiveReadAt, setEffectiveReadAt] = useState<string | null>(readAt)
  useEffect(() => {
    setEffectiveReadAt((prev) => (prev === null && readAt != null ? readAt : prev))
  }, [readAt])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [message, setMessage] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mentionQuery, setMentionQuery] = useState<{ query: string; position: number } | null>(null)
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [activityFilter, setActivityFilter] = useState<'all' | 'comments' | 'attachments'>('all')
  const [activitySearch, setActivitySearch] = useState('')
  const [optimisticComments, setOptimisticComments] = useState<
    { comment: CommentNode; parentQuote?: { author: string; body: string }; status: 'sending' | 'sent' }[]
  >([])
  const attachButtonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const { toasts, addToast, removeToast } = useToast()

  const currentUserDisplayName =
    members.find((m) => m.id === currentUserId)?.display_name ||
    members.find((m) => m.id === currentUserId)?.email ||
    'You'

  function findCommentById(nodes: CommentNode[], id: string): CommentNode | null {
    for (const c of nodes) {
      if (c.id === id) return c
      if (c.replies?.length) {
        const found = findCommentById(c.replies, id)
        if (found) return found
      }
    }
    return null
  }

  function flatCommentIds(nodes: CommentNode[]): string[] {
    return nodes.flatMap((c) => [c.id, ...(c.replies ? flatCommentIds(c.replies) : [])])
  }
  const serverCommentIds = new Set(flatCommentIds(comments))
  useEffect(() => {
    setOptimisticComments((prev) => prev.filter((o) => !serverCommentIds.has(o.comment.id)))
  }, [comments])

  // Enable real-time updates (skip refresh for our own inserts so chat stays fluid)
  useTaskRealtime(taskId, true, currentUserId)

  // Mark chat as read when opened
  useEffect(() => {
    setTaskChatReadAction(companyId, taskId).then(() => {})
    setEffectiveReadAt((prev) => prev ?? new Date().toISOString())
  }, [companyId, taskId])

  // Flatten comments (root + replies) into one chronological list so replies appear at bottom (WhatsApp-style)
  type CommentWithQuote = { comment: CommentNode; parentQuote?: { author: string; body: string } }
  function flattenComments(nodes: CommentNode[], parent?: { author: string; body: string }): CommentWithQuote[] {
    const out: CommentWithQuote[] = []
    for (const c of nodes) {
      const copy = { ...c, replies: undefined }
      out.push({ comment: copy, parentQuote: parent })
      if (c.replies?.length) {
        const quote = { author: c.author, body: c.body.slice(0, 100) + (c.body.length > 100 ? '…' : '') }
        out.push(...flattenComments(c.replies, quote))
      }
    }
    return out
  }
  const flatComments = flattenComments(comments)
  const mergedComments: { comment: CommentNode; parentQuote?: { author: string; body: string }; sendStatus?: 'sending' | 'sent' }[] = [
    ...flatComments.map(({ comment, parentQuote }) => ({ comment, parentQuote })),
    ...optimisticComments
      .filter((o) => !serverCommentIds.has(o.comment.id))
      .map(({ comment, parentQuote, status }) => ({ comment, parentQuote, sendStatus: status })),
  ]

  type ActivityItem =
    | { type: 'comment'; data: CommentNode; parentQuote?: { author: string; body: string }; sendStatus?: 'sending' | 'sent' }
    | { type: 'attachment'; data: Document }

  const allActivities: ActivityItem[] = [
    ...attachments.map((a) => ({ type: 'attachment' as const, data: a })),
    ...mergedComments.map(({ comment, parentQuote, sendStatus }) => ({
      type: 'comment' as const,
      data: comment,
      parentQuote,
      sendStatus,
    })),
  ].sort((a, b) => {
    const aDate = a.type === 'attachment' ? (a.data.attached_at || '') : a.data.created_at
    const bDate = b.type === 'attachment' ? (b.data.attached_at || '') : b.data.created_at
    return new Date(aDate).getTime() - new Date(bDate).getTime()
  })
  
  // Filter activities
  let filteredActivities = allActivities
  if (activityFilter === 'comments') {
    filteredActivities = filteredActivities.filter((a) => a.type === 'comment')
  } else if (activityFilter === 'attachments') {
    filteredActivities = filteredActivities.filter((a) => a.type === 'attachment')
  }
  
  // Search filter
  if (activitySearch.trim()) {
    const searchLower = activitySearch.toLowerCase()
    filteredActivities = filteredActivities.filter((a) => {
      if (a.type === 'attachment') {
        return (
          a.data.title?.toLowerCase().includes(searchLower) ||
          a.data.file_name?.toLowerCase().includes(searchLower) ||
          a.data.attached_by?.toLowerCase().includes(searchLower)
        )
      } else {
        return (
          a.data.body.toLowerCase().includes(searchLower) ||
          a.data.author.toLowerCase().includes(searchLower)
        )
      }
    })
  }
  
  const activities = filteredActivities

  const readAtMs = effectiveReadAt ? new Date(effectiveReadAt).getTime() : 0
  const seenActivities: typeof activities = []
  const newActivities: typeof activities = []
  for (const a of activities) {
    const t = a.type === 'attachment' ? new Date(a.data.attached_at || 0).getTime() : new Date(a.data.created_at).getTime()
    if (t <= readAtMs) seenActivities.push(a)
    else newActivities.push(a)
  }

  // Scroll to bottom after new comments/attachments (defer so DOM has laid out new content)
  useEffect(() => {
    if (activities.length === 0) return
    const el = listRef.current
    if (!el) return
    const scrollToBottom = () => {
      el.scrollTop = el.scrollHeight
    }
    const id = requestAnimationFrame(() => requestAnimationFrame(scrollToBottom))
    return () => cancelAnimationFrame(id)
  }, [activities.length])

  const urgency = getUrgency(taskDueDate)
  const mentionSuggestions = mentionQuery
    ? getMentionSuggestions(message, mentionQuery.position, members)
    : []

  useEffect(() => {
    if (textareaRef.current && mentionQuery) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(mentionQuery.position, mentionQuery.position)
    }
  }, [mentionQuery])

  function handleMessageChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    const cursorPos = e.target.selectionStart
    setMessage(value)

    // Check for @mention
    const beforeCursor = value.slice(0, cursorPos)
    const lastAtIndex = beforeCursor.lastIndexOf('@')
    if (lastAtIndex !== -1) {
      const afterAt = beforeCursor.slice(lastAtIndex + 1)
      if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
        setMentionQuery({ query: afterAt, position: cursorPos })
        return
      }
    }
    setMentionQuery(null)
  }

  function insertMention(member: { id: string; email: string; display_name: string | null }) {
    if (!mentionQuery || !textareaRef.current) return
    const before = message.slice(0, mentionQuery.position - mentionQuery.query.length - 1)
    const after = message.slice(mentionQuery.position)
    const mentionText = `@${member.display_name || member.email.split('@')[0]} `
    setMessage(before + mentionText + after)
    setMentionQuery(null)
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = before.length + mentionText.length
        textareaRef.current.setSelectionRange(newPos, newPos)
        textareaRef.current.focus()
      }
    }, 0)
  }

  async function onSubmitMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit || !message.trim()) return
    setError(null)
    const body = message.trim()
    const tempId = `opt-${Date.now()}`
    const now = new Date().toISOString()
    const optimisticComment: CommentNode = {
      id: tempId,
      user_id: currentUserId!,
      body,
      created_at: now,
      updated_at: now,
      author: currentUserDisplayName,
    }
    setOptimisticComments((prev) => [...prev, { comment: optimisticComment, status: 'sending' }])
    setMessage('')
    setMentionQuery(null)
    setLoading(true)
    const r = await createTaskCommentAction(companyId, taskId, body, null)
    setLoading(false)
    if (r.error) {
      setOptimisticComments((prev) => prev.filter((o) => o.comment.id !== tempId))
      setError(r.error)
      addToast(r.error, 'error')
      setMessage(body)
    } else {
      setOptimisticComments((prev) =>
        prev.map((o) =>
          o.comment.id === tempId ? { ...o, comment: { ...o.comment, id: r.id ?? tempId }, status: 'sent' as const } : o
        )
      )
      addToast('Comment posted', 'success')
      // Don't router.refresh() here – message is already shown; realtime will sync others' messages
    }
  }

  async function onSubmitReply(parentId: string, e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit || !replyBody.trim()) return
    setError(null)
    const body = replyBody.trim()
    const parent = findCommentById(comments, parentId)
    const parentQuote = parent
      ? { author: parent.author, body: parent.body.slice(0, 100) + (parent.body.length > 100 ? '…' : '') }
      : undefined
    const tempId = `opt-${Date.now()}`
    const now = new Date().toISOString()
    const optimisticComment: CommentNode = {
      id: tempId,
      user_id: currentUserId!,
      body,
      created_at: now,
      updated_at: now,
      author: currentUserDisplayName,
    }
    setOptimisticComments((prev) => [...prev, { comment: optimisticComment, parentQuote, status: 'sending' }])
    setReplyTo(null)
    setReplyBody('')
    setLoading(true)
    const r = await createTaskCommentAction(companyId, taskId, body, parentId)
    setLoading(false)
    if (r.error) {
      setOptimisticComments((prev) => prev.filter((o) => o.comment.id !== tempId))
      setError(r.error)
      addToast(r.error, 'error')
      setReplyTo(parentId)
      setReplyBody(body)
    } else {
      setOptimisticComments((prev) =>
        prev.map((o) =>
          o.comment.id === tempId
            ? { ...o, comment: { ...o.comment, id: r.id ?? tempId }, status: 'sent' as const }
            : o
        )
      )
      addToast('Reply posted', 'success')
      // Don't router.refresh() here – reply is already shown; realtime will sync others'
    }
  }

  async function onAttachDocument(documentId: string) {
    setLoading(true)
    setError(null)
    const r = await attachDocumentToTaskAction(companyId, taskId, documentId)
    setLoading(false)
    if (r.error) {
      setError(r.error)
      addToast(r.error, 'error')
    } else {
      setShowAttachMenu(false)
      addToast('Document attached', 'success')
      router.refresh()
    }
  }

  async function onDetachDocument(documentId: string) {
    if (!confirm('Remove this document from the task?')) return
    setLoading(true)
    const r = await detachDocumentFromTaskAction(companyId, taskId, documentId)
    setLoading(false)
    if (r.error) {
      setError(r.error)
      addToast(r.error, 'error')
    } else {
      addToast('Document removed', 'success')
      router.refresh()
    }
  }


  /* Same pattern as CompanyFeed/ChatClient: fill parent, only list scrolls, input sticky */
  const Wrapper = isChatOnly ? Card : 'div'
  const wrapperProps = isChatOnly
    ? { padding: 'none' as const, className: 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden' }
    : {
        className:
          'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900',
      }

  return (
    <Wrapper {...wrapperProps}>
      {!isChatOnly && (
        <>
          {/* Header */}
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50 sm:text-xl">{taskTitle}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge className={STATUS_COLORS[taskStatus]}>{STATUS_LABELS[taskStatus]}</Badge>
                  {urgency && <Badge className={urgency.color}>{urgency.label}</Badge>}
                  {taskDueDate && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Due {new Date(taskDueDate).toLocaleDateString()}
                    </span>
                  )}
                  {taskAssigneeName && (
                    <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" size="sm">
                      {taskAssigneeName}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Attachments:</span>
                {attachments.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-1 rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">
                    <Link
                      href={`/dashboard/companies/${slug}/documents/${doc.id}?returnTo=/dashboard/companies/${slug}/tasks/${taskId}`}
                      className="text-zinc-700 hover:underline dark:text-zinc-300"
                    >
                      {doc.file_name || doc.title}
                    </Link>
                    {doc.attached_by && (
                      <span className="text-zinc-500 dark:text-zinc-400">by {doc.attached_by}</span>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => onDetachDocument(doc.id)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-400"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Only message list scrolls; input stays sticky (overflow-hidden so only inner overflow-y-auto scrolls) */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Activity Feed Controls (hidden in chatOnly to match company feed) */}
        {!isChatOnly && (
          <div className="shrink-0 border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-1 overflow-x-auto">
                {(['all', 'comments', 'attachments'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setActivityFilter(f)}
                    className={`whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      activityFilter === f
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                placeholder="Search activity…"
                className="w-full rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 sm:w-48"
              />
            </div>
          </div>
        )}
        {/* Only this area scrolls; header/filters above and input below stay fixed */}
        <div
          ref={listRef}
          className={`min-w-0 flex-1 overflow-y-auto text-base sm:text-sm ${isChatOnly ? 'min-h-0 px-4 py-3 sm:px-6 sm:py-4' : 'px-4 py-4 min-h-[200px] sm:min-h-0'}`}
        >
          <div className="space-y-4">
          {seenActivities.map((activity) => {
            if (activity.type === 'attachment') {
              const doc = activity.data
              return (
                <div key={`attach-${doc.id}`} className="flex items-start gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
                        {doc.attached_by || 'Someone'}
                      </span>
                      <span className="text-xs text-stone-500 dark:text-stone-400">attached</span>
                      <Link
                        href={`/dashboard/companies/${slug}/documents/${doc.id}?returnTo=/dashboard/companies/${slug}/tasks/${taskId}`}
                        className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {doc.file_name || doc.title}
                      </Link>
                    </div>
                    {doc.attached_at && (
                      <span className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                        {new Date(doc.attached_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )
            } else {
              const commentActivity = activity as {
                type: 'comment'
                data: CommentNode
                parentQuote?: { author: string; body: string }
                sendStatus?: 'sending' | 'sent'
              }
              return (
                <CommentWithReactions
                  key={commentActivity.data.id}
                  comment={commentActivity.data}
                  depth={0}
                  parentQuote={commentActivity.parentQuote}
                  showReplies={false}
                  sendStatus={commentActivity.sendStatus}
                  companyId={companyId}
                  taskId={taskId}
                  currentUserId={currentUserId}
                  canEdit={canEdit}
                  onReply={setReplyTo}
                  replyTo={replyTo}
                  replyBody={replyBody}
                  setReplyBody={setReplyBody}
                  onSubmitReply={onSubmitReply}
                  loading={loading}
                />
              )
            }
          })}
          {newActivities.length > 0 && (
            <div className="flex items-center gap-2 py-2">
              <span className="text-xs font-medium uppercase tracking-wide text-teal-600 dark:text-teal-400">
                New messages
              </span>
              <div className="h-px flex-1 bg-teal-200 dark:bg-teal-800" />
            </div>
          )}
          {newActivities.map((activity) => {
            if (activity.type === 'attachment') {
              const doc = activity.data
              return (
                <div key={`attach-${doc.id}`} className="flex items-start gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
                        {doc.attached_by || 'Someone'}
                      </span>
                      <span className="text-xs text-stone-500 dark:text-stone-400">attached</span>
                      <Link
                        href={`/dashboard/companies/${slug}/documents/${doc.id}?returnTo=/dashboard/companies/${slug}/tasks/${taskId}`}
                        className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {doc.file_name || doc.title}
                      </Link>
                    </div>
                    {doc.attached_at && (
                      <span className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                        {new Date(doc.attached_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )
            } else {
              const commentActivity = activity as {
                type: 'comment'
                data: CommentNode
                parentQuote?: { author: string; body: string }
                sendStatus?: 'sending' | 'sent'
              }
              return (
                <CommentWithReactions
                  key={commentActivity.data.id}
                  comment={commentActivity.data}
                  depth={0}
                  parentQuote={commentActivity.parentQuote}
                  showReplies={false}
                  sendStatus={commentActivity.sendStatus}
                  companyId={companyId}
                  taskId={taskId}
                  currentUserId={currentUserId}
                  canEdit={canEdit}
                  onReply={setReplyTo}
                  replyTo={replyTo}
                  replyBody={replyBody}
                  setReplyBody={setReplyBody}
                  onSubmitReply={onSubmitReply}
                  loading={loading}
                />
              )
            }
          })}
          {activities.length === 0 && (
            <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {activitySearch || activityFilter !== 'all'
                ? 'No matching activity found.'
                : 'No comments yet. Start the conversation!'}
            </p>
          )}
          </div>
        </div>
      </div>

      {/* Input Area - shrink-0 so it stays anchored at bottom (match company feed layout) */}
      {canEdit && (
        <div className="shrink-0 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900 sm:px-6">
          <form onSubmit={onSubmitMessage} className="relative">
            {error && (
              <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <div className="relative flex items-center gap-2">
              <div className="relative z-50 shrink-0">
                <button
                  ref={attachButtonRef}
                  type="button"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-400"
                  aria-label="Attach document"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                {showAttachMenu && (
                  <AttachDocumentMenu
                    companyId={companyId}
                    taskId={taskId}
                    documents={availableDocuments.filter((d) => !attachments.some((a) => a.id === d.id))}
                    onAttach={() => router.refresh()}
                    onClose={() => setShowAttachMenu(false)}
                  />
                )}
              </div>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleMessageChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    onSubmitMessage(e as unknown as React.FormEvent)
                  }
                }}
                placeholder="Type a message… (Ctrl+Enter to send)"
                rows={2}
                className="min-w-0 flex-1 resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <button
                type="submit"
                disabled={loading || !message.trim()}
                aria-label="Send"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {loading ? <span className="text-xs">…</span> : <SendIcon className="h-5 w-5" />}
              </button>
            </div>
            {mentionSuggestions.length > 0 && mentionQuery && (
              <div className="absolute bottom-full left-0 z-50 mb-1 w-full max-w-md rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900 sm:max-w-lg">
                <div className="border-b border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  Mention someone
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {mentionSuggestions.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => insertMention(m)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                          {(m.display_name || m.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{m.matchText}</div>
                          <div className="text-xs text-zinc-500 truncate">{m.email}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Ctrl+Enter to send · Type @ to mention
            </p>
          </form>
        </div>
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </Wrapper>
  )
}
