'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { updateTaskCommentAction, deleteTaskCommentAction } from '@/app/actions/tasks'
import { addReactionAction, removeReactionAction, getCommentReactionsAction } from '@/app/actions/task-reactions'
import { highlightMentions } from '@/lib/parse-mentions'
import { EmojiPicker } from '@/components/ui/EmojiPicker'

type CommentNode = {
  id: string
  user_id: string
  body: string
  created_at: string
  updated_at: string
  author: string
  replies?: CommentNode[]
}

type Reaction = {
  comment_id: string
  emoji: string
  user_id: string
  user_name: string
}

export function CommentWithReactions({
  comment,
  depth,
  companyId,
  taskId,
  currentUserId,
  canEdit,
  onReply,
  replyTo,
  replyBody,
  setReplyBody,
  onSubmitReply,
  loading,
}: {
  comment: CommentNode
  depth: number
  companyId: string
  taskId: string
  currentUserId: string | null
  canEdit: boolean
  onReply: (commentId: string | null) => void
  replyTo: string | null
  replyBody: string
  setReplyBody: (body: string) => void
  onSubmitReply: (parentId: string, e: React.FormEvent) => void
  loading: boolean
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editBody, setEditBody] = useState(comment.body)
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [loadingReactions, setLoadingReactions] = useState(false)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    loadReactions()
  }, [comment.id])

  async function loadReactions() {
    setLoadingReactions(true)
    const result = await getCommentReactionsAction([comment.id])
    if (!result.error) {
      setReactions(result.reactions as Reaction[])
    }
    setLoadingReactions(false)
  }

  async function handleReaction(emoji: string) {
    const existingReaction = reactions.find(
      (r) => r.comment_id === comment.id && r.emoji === emoji && r.user_id === currentUserId
    )
    
    if (existingReaction) {
      await removeReactionAction(companyId, comment.id, emoji)
    } else {
      await addReactionAction(companyId, comment.id, emoji)
    }
    await loadReactions()
    router.refresh()
  }

  async function handleSaveEdit() {
    if (!editBody.trim()) return
    setLoadingReactions(true)
    const r = await updateTaskCommentAction(companyId, comment.id, editBody.trim())
    setLoadingReactions(false)
    if (!r?.error) {
      setIsEditing(false)
      router.refresh()
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this comment?')) return
    const r = await deleteTaskCommentAction(companyId, comment.id)
    if (!r?.error) router.refresh()
  }

  // Group reactions by emoji
  const reactionsByEmoji = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = []
    acc[r.emoji].push(r)
    return acc
  }, {} as Record<string, Reaction[]>)

  const isThreaded = depth > 0
  const hasReplies = comment.replies && comment.replies.length > 0

  return (
    <div className={isThreaded ? 'ml-4 sm:ml-8 mt-3' : ''}>
      <div className={`rounded-lg ${isThreaded ? 'bg-zinc-50/50 dark:bg-zinc-800/30' : 'bg-zinc-50 dark:bg-zinc-800/50'} p-3`}>
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            {comment.author.charAt(0).toUpperCase()}
          </div>
          
          <div className="min-w-0 flex-1">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-900 dark:text-zinc-50">{comment.author}</span>
                {isThreaded && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">replied</span>
                )}
              </div>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {new Date(comment.created_at).toLocaleString()}
              </span>
            </div>

            {/* Content */}
            {isEditing ? (
              <div className="mt-2">
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={3}
                  className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
                  autoFocus
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={loadingReactions || !editBody.trim()}
                    className="rounded bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsEditing(false); setEditBody(comment.body) }}
                    className="rounded border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
                {highlightMentions(comment.body)}
              </p>
            )}

            {/* Reactions */}
            {Object.keys(reactionsByEmoji).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(reactionsByEmoji).map(([emoji, emojiReactions]) => {
                  const userReacted = emojiReactions.some((r) => r.user_id === currentUserId)
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleReaction(emoji)}
                      disabled={!canEdit}
                      className={`group flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                        userReacted
                          ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800'
                      } ${!canEdit ? 'cursor-default' : ''}`}
                    >
                      <span>{emoji}</span>
                      <span className="text-zinc-600 dark:text-zinc-400">{emojiReactions.length}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Actions */}
            {canEdit && !isEditing && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="relative">
                  <button
                    ref={emojiButtonRef}
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-400"
                  >
                    <span>😊</span>
                    <span>React</span>
                  </button>
                  {showEmojiPicker && (
                    <EmojiPicker
                      onSelect={(emoji) => handleReaction(emoji)}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setIsEditing(true); setEditBody(comment.body) }}
                  className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-xs text-red-600 hover:text-red-800 dark:text-red-400"
                >
                  Delete
                </button>
                {depth === 0 && (
                  <button
                    type="button"
                    onClick={() => onReply(comment.id)}
                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
                  >
                    Reply
                  </button>
                )}
              </div>
            )}

            {/* Reply form */}
            {replyTo === comment.id && (
              <form onSubmit={(e) => onSubmitReply(comment.id, e)} className="mt-3">
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Write a reply…"
                  rows={2}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
                  autoFocus
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={loading || !replyBody.trim()}
                    className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => { onReply(null); setReplyBody('') }}
                    className="rounded border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {hasReplies && (
        <div className="mt-2 space-y-2 border-l-2 border-zinc-200 pl-4 dark:border-zinc-700">
          {comment.replies!.map((reply) => (
            <CommentWithReactions
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              companyId={companyId}
              taskId={taskId}
              currentUserId={currentUserId}
              canEdit={canEdit}
              onReply={onReply}
              replyTo={replyTo}
              replyBody={replyBody}
              setReplyBody={setReplyBody}
              onSubmitReply={onSubmitReply}
              loading={loading}
            />
          ))}
        </div>
      )}
    </div>
  )
}
