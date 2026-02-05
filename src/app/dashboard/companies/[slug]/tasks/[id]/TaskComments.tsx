'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createTaskCommentAction,
  updateTaskCommentAction,
  deleteTaskCommentAction,
} from '@/app/actions/tasks'

type CommentNode = {
  id: string
  user_id: string
  body: string
  created_at: string
  updated_at: string
  author: string
  replies?: CommentNode[]
}

export default function TaskComments({
  companyId,
  taskId,
  slug,
  comments,
  canEdit,
}: {
  companyId: string
  taskId: string
  slug: string
  comments: CommentNode[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [newBody, setNewBody] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmitNew(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit || !newBody.trim()) return
    setLoading(true)
    setError(null)
    const r = await createTaskCommentAction(companyId, taskId, newBody.trim(), null)
    setLoading(false)
    if (r.error) setError(r.error)
    else {
      setNewBody('')
      router.refresh()
    }
  }

  async function onSubmitReply(parentId: string, e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit || !replyBody.trim()) return
    setLoading(true)
    setError(null)
    const r = await createTaskCommentAction(companyId, taskId, replyBody.trim(), parentId)
    setLoading(false)
    if (r.error) setError(r.error)
    else {
      setReplyTo(null)
      setReplyBody('')
      router.refresh()
    }
  }

  async function onSaveEdit(commentId: string) {
    if (!canEdit || !editBody.trim()) return
    setLoading(true)
    setError(null)
    const r = await updateTaskCommentAction(companyId, commentId, editBody.trim())
    setLoading(false)
    if (r?.error) setError(r.error)
    else {
      setEditId(null)
      setEditBody('')
      router.refresh()
    }
  }

  async function onDelete(commentId: string) {
    if (!canEdit || !confirm('Delete this comment?')) return
    const r = await deleteTaskCommentAction(companyId, commentId)
    if (r?.error) setError(r.error)
    else router.refresh()
  }

  function CommentBlock({ c, depth }: { c: CommentNode; depth: number }) {
    const isEditing = editId === c.id
    return (
      <div className={depth > 0 ? 'ml-6 mt-2 border-l-2 border-zinc-200 pl-4 dark:border-zinc-700' : ''}>
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{c.author}</span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {new Date(c.created_at).toLocaleString()}
            </span>
          </div>
          {isEditing ? (
            <div className="mt-2">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={2}
                className="w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => onSaveEdit(c.id)}
                  disabled={loading}
                  className="text-sm text-zinc-700 hover:underline dark:text-zinc-300"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => { setEditId(null); setEditBody('') }}
                  className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{c.body}</p>
          )}
          {canEdit && !isEditing && (
            <div className="mt-2 flex gap-3 text-xs">
              <button
                type="button"
                onClick={() => { setEditId(c.id); setEditBody(c.body) }}
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(c.id)}
                className="text-red-600 hover:text-red-800 dark:text-red-400"
              >
                Delete
              </button>
              {depth === 0 && (
                <button
                  type="button"
                  onClick={() => setReplyTo(c.id)}
                  className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
                >
                  Reply
                </button>
              )}
            </div>
          )}
        </div>
        {replyTo === c.id && (
          <form
            onSubmit={(e) => onSubmitReply(c.id, e)}
            className="mt-2 ml-4"
          >
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply…"
              rows={2}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
            />
            <div className="mt-1 flex gap-2">
              <button
                type="submit"
                disabled={loading || !replyBody.trim()}
                className="rounded bg-zinc-900 px-2 py-1 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Reply
              </button>
              <button
                type="button"
                onClick={() => { setReplyTo(null); setReplyBody('') }}
                className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {c.replies?.map((r) => <CommentBlock key={r.id} c={r} depth={depth + 1} />)}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Comments</h2>
      {error && (
        <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </div>
      )}
      {canEdit && (
        <form onSubmit={onSubmitNew} className="mt-4">
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={loading || !newBody.trim()}
            className="mt-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Post comment
          </button>
        </form>
      )}
      <div className="mt-6 space-y-4">
        {comments.map((c) => (
          <CommentBlock key={c.id} c={c} depth={0} />
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No comments yet.</p>
        )}
      </div>
    </div>
  )
}
