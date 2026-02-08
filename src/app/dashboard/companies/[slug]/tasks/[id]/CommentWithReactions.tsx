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
  parentQuote,
  showReplies = true,
  sendStatus,
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
  parentQuote?: { author: string; body: string }
  showReplies?: boolean
  sendStatus?: 'sending' | 'sent'
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
  const hasReplies = showReplies && comment.replies && comment.replies.length > 0
  const isOwn = currentUserId !== null && comment.user_id === currentUserId

  return (
    <div className={`${isThreaded ? 'ml-4 sm:ml-8 mt-3' : ''} ${isOwn ? 'flex justify-end' : ''}`}>
      <div
        className={`rounded-lg p-3 max-w-[85%] ${
          isThreaded && !isOwn
            ? 'bg-stone-50/80 dark:bg-stone-800/40'
            : isOwn
              ? 'bg-teal-600 text-white dark:bg-teal-600/90'
              : 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200'
        }`}
      >
        <div className={`flex items-start gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
          {/* Avatar */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-medium text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
            {comment.author.charAt(0).toUpperCase()}
          </div>
          
          <div className="min-w-0 flex-1">
            {/* Quoted message (WhatsApp-style reply reference) */}
            {parentQuote && (
              <div className={`mb-2 border-l-2 pl-2 text-xs ${isOwn ? 'border-teal-400/70 text-teal-50' : 'border-stone-300 dark:border-stone-500'}`}>
                <span className={isOwn ? 'font-medium text-teal-50' : 'font-medium text-stone-600 dark:text-stone-400'}>{parentQuote.author}</span>
                <p className={`mt-0.5 truncate ${isOwn ? 'text-teal-50/90' : 'text-stone-500 dark:text-stone-500'}`}>{parentQuote.body}</p>
              </div>
            )}
            {/* Header */}
            <div className={`flex flex-wrap items-center gap-2 ${isOwn ? 'flex-row-reverse justify-end' : 'justify-between'}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-stone-900 dark:text-stone-50">{comment.author}</span>
                {isThreaded && !parentQuote && (
                  <span className="text-xs text-stone-600 dark:text-stone-400">replied</span>
                )}
              </div>
              <span className="flex items-center gap-1">
                <span className={`text-xs ${isOwn ? 'text-teal-100' : 'text-stone-600 dark:text-stone-300'}`}>
                  {new Date(comment.created_at).toLocaleString()}
                </span>
                {isOwn && sendStatus && (
                  <span className="inline-flex" aria-label={sendStatus === 'sending' ? 'Sending' : 'Sent'}>
                    {sendStatus === 'sending' ? (
                      <svg className="h-3.5 w-3.5 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                      </svg>
                    ) : (
                      <span className="flex -space-x-1">
                        <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                        <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      </span>
                    )}
                  </span>
                )}
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
              <p className={`mt-1.5 whitespace-pre-wrap text-sm ${isOwn ? 'text-white text-right' : 'text-stone-800 dark:text-stone-200'}`}>
                {highlightMentions(comment.body)}
              </p>
            )}

            {/* Reactions */}
            {Object.keys(reactionsByEmoji).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(reactionsByEmoji).map(([emoji, emojiReactions]) => {
                  const userReacted = emojiReactions.some((r) => r.user_id === currentUserId)
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleReaction(emoji)}
                      disabled={!canEdit}
                      className={`group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        userReacted
                          ? 'border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-950/30'
                          : 'border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800'
                      } ${!canEdit ? 'cursor-default' : ''}`}
                    >
                      <span className="text-base leading-none">{emoji}</span>
                      <span className="text-stone-600 dark:text-stone-400">{emojiReactions.length}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Actions */}
            {canEdit && !isEditing && (
              <div className={`mt-2 flex flex-wrap items-center gap-3 ${isOwn ? 'text-teal-100 [&_button]:hover:text-white' : ''}`}>
                <div className="relative">
                  <button
                    ref={emojiButtonRef}
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${isOwn ? 'hover:bg-teal-500/50' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-400'}`}
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
                  className={isOwn ? 'text-xs' : 'text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-400'}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className={isOwn ? 'text-xs text-red-200 hover:text-red-100' : 'text-xs text-red-600 hover:text-red-800 dark:text-red-400'}
                >
                  Delete
                </button>
                {depth === 0 && (
                  <button
                    type="button"
                    onClick={() => onReply(comment.id)}
                    className={isOwn ? 'text-xs' : 'text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-400'}
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
