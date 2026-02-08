'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { SendIcon } from '@/components/ui/SendIcon'
import { getCompanyFeedAction, postCompanyFeedAction, type FeedPost } from '@/app/actions/company-feed'
import { getCompanyFeedReadAtAction, setCompanyFeedReadAction } from '@/app/actions/chat-read'
import { useCompanyFeedRealtime } from './useCompanyFeedRealtime'

type OptimisticPost = FeedPost & { status: 'sending' | 'sent' }

export default function CompanyFeed({
  companyId,
  currentUserId,
  embeddedInTab,
  onNewCountChange,
}: {
  companyId: string
  currentUserId: string
  embeddedInTab?: boolean
  onNewCountChange?: (count: number) => void
}) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [optimisticPosts, setOptimisticPosts] = useState<OptimisticPost[]>([])
  const [effectiveReadAt, setEffectiveReadAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [postError, setPostError] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  async function loadFeed() {
    setLoading(true)
    const [feedRes, readRes] = await Promise.all([
      getCompanyFeedAction(companyId),
      getCompanyFeedReadAtAction(companyId),
    ])
    setLoading(false)
    if (feedRes.error) return
    setPosts(feedRes.posts)
    setEffectiveReadAt((prev) => prev ?? readRes ?? null)
    setOptimisticPosts((prev) => prev.filter((o) => !feedRes.posts.some((p) => p.id === o.id)))
  }

  async function loadFeedSilent() {
    const [feedRes, readRes] = await Promise.all([
      getCompanyFeedAction(companyId),
      getCompanyFeedReadAtAction(companyId),
    ])
    if (feedRes.error) return
    setPosts(feedRes.posts)
    setEffectiveReadAt((prev) => prev ?? readRes ?? null)
    setOptimisticPosts((prev) => prev.filter((o) => !feedRes.posts.some((p) => p.id === o.id)))
  }

  useEffect(() => {
    loadFeed()
  }, [companyId])

  useCompanyFeedRealtime(companyId, true, currentUserId, loadFeedSilent)

  useEffect(() => {
    setCompanyFeedReadAction(companyId).then(() => {})
    setEffectiveReadAt((prev) => prev ?? new Date().toISOString())
  }, [companyId])

  const displayPosts = [...posts]
  for (const o of optimisticPosts) {
    if (!displayPosts.some((p) => p.id === o.id)) displayPosts.push(o)
  }
  displayPosts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const readAtMs = effectiveReadAt ? new Date(effectiveReadAt).getTime() : 0
  const seenPosts = displayPosts.filter((p) => new Date(p.created_at).getTime() <= readAtMs)
  const newPosts = displayPosts.filter((p) => new Date(p.created_at).getTime() > readAtMs)

  useEffect(() => {
    onNewCountChange?.(newPosts.length)
  }, [newPosts.length, onNewCountChange])

  // Scroll to bottom after new messages (defer so DOM has laid out new content)
  useEffect(() => {
    if (displayPosts.length === 0) return
    const el = listRef.current
    if (!el) return
    const scrollToBottom = () => {
      el.scrollTop = el.scrollHeight
    }
    const id = requestAnimationFrame(() => requestAnimationFrame(scrollToBottom))
    return () => cancelAnimationFrame(id)
  }, [displayPosts.length])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed || submitting) return
    setPostError(null)
    const tempId = `opt-${Date.now()}`
    const now = new Date().toISOString()
    const optimistic: OptimisticPost = {
      id: tempId,
      company_id: companyId,
      user_id: currentUserId,
      body: trimmed,
      created_at: now,
      author_name: 'You',
      status: 'sending',
    }
    setOptimisticPosts((prev) => [...prev, optimistic])
    setBody('')
    setSubmitting(true)
    const r = await postCompanyFeedAction(companyId, trimmed)
    setSubmitting(false)
    if (r.error) {
      setOptimisticPosts((prev) => prev.filter((p) => p.id !== tempId))
      setPostError(r.error)
      setBody(trimmed)
      return
    }
    setOptimisticPosts((prev) =>
      prev.map((p) => (p.id === tempId ? { ...p, id: r.id ?? tempId, status: 'sent' as const } : p))
    )
    // Don't loadFeed() or router.refresh() – post is already shown; avoids loading skeleton flash
  }

  return (
    <Card
      padding="none"
      className={
        embeddedInTab
          ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden w-full'
          : 'flex min-h-[50dvh] flex-col overflow-hidden sm:min-h-[280px] sm:h-[55vh] sm:max-h-[calc(100vh-10rem)]'
      }
    >
      {/* Header fixed; only list below scrolls; input sticky at bottom */}
      <div className="shrink-0 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700 sm:px-6 sm:py-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Team feed</h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Share what you&apos;re working on, ask for help, or post updates.
        </p>
      </div>
      {/* Only this list scrolls; input stays sticky at bottom */}
      <div
        ref={listRef}
        className={`min-w-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 ${embeddedInTab ? 'min-h-0' : 'min-h-[200px] sm:min-h-0'}`}
      >
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && displayPosts.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No posts yet. Be the first to share!
          </p>
        )}
        {!loading && displayPosts.length > 0 && (
          <ul className="space-y-4">
            {seenPosts.map((post) => {
              const isOwn = post.user_id === currentUserId
              const status = 'status' in post ? (post as OptimisticPost).status : null
              return (
                <li
                  key={post.id}
                  className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-medium text-stone-600 dark:bg-stone-600 dark:text-stone-300">
                    {post.author_name.charAt(0).toUpperCase()}
                  </div>
                  <div
                    className={`min-w-0 max-w-[85%] rounded-lg px-3 py-2 ${
                      isOwn
                        ? 'bg-teal-600 text-white dark:bg-teal-600/90'
                        : 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200'
                    }`}
                  >
                    <div className={`flex flex-wrap items-baseline gap-2 ${isOwn ? 'flex-row-reverse justify-end' : ''}`}>
                      <span className="text-sm font-medium">
                        {post.author_name}
                      </span>
                      <span className={`text-xs ${isOwn ? 'text-teal-100' : 'text-stone-600 dark:text-stone-300'}`}>
                        {new Date(post.created_at).toLocaleString()}
                      </span>
                      {isOwn && status && (
                        <span className="ml-0.5 inline-flex" aria-label={status === 'sending' ? 'Sending' : 'Sent'}>
                          {status === 'sending' ? (
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
                    </div>
                    <p className={`mt-0.5 whitespace-pre-wrap text-sm ${isOwn ? 'text-right text-white' : ''}`}>
                      {post.body}
                    </p>
                  </div>
                </li>
              )
            })}
            {newPosts.length > 0 && (
              <li className="flex items-center gap-2 py-2">
                <span className="text-xs font-medium uppercase tracking-wide text-teal-600 dark:text-teal-400">
                  New messages
                </span>
                <div className="h-px flex-1 bg-teal-200 dark:bg-teal-800" />
              </li>
            )}
            {newPosts.map((post) => {
              const isOwn = post.user_id === currentUserId
              const status = 'status' in post ? (post as OptimisticPost).status : null
              return (
                <li
                  key={post.id}
                  className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-medium text-stone-600 dark:bg-stone-600 dark:text-stone-300">
                    {post.author_name.charAt(0).toUpperCase()}
                  </div>
                  <div
                    className={`min-w-0 max-w-[85%] rounded-lg px-3 py-2 ${
                      isOwn
                        ? 'bg-teal-600 text-white dark:bg-teal-600/90'
                        : 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200'
                    }`}
                  >
                    <div className={`flex flex-wrap items-baseline gap-2 ${isOwn ? 'flex-row-reverse justify-end' : ''}`}>
                      <span className="text-sm font-medium">
                        {post.author_name}
                      </span>
                      <span className={`text-xs ${isOwn ? 'text-teal-100' : 'text-stone-600 dark:text-stone-300'}`}>
                        {new Date(post.created_at).toLocaleString()}
                      </span>
                      {isOwn && status && (
                        <span className="ml-0.5 inline-flex" aria-label={status === 'sending' ? 'Sending' : 'Sent'}>
                          {status === 'sending' ? (
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
                    </div>
                    <p className={`mt-0.5 whitespace-pre-wrap text-sm ${isOwn ? 'text-right text-white' : ''}`}>
                      {post.body}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900 sm:px-6"
      >
        {postError && (
          <p className="mb-2 text-sm text-red-600 dark:text-red-400">{postError}</p>
        )}
        <div className="flex items-center gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent)
            }}
            placeholder="Share an update, ask for help…"
            rows={2}
            className="min-w-0 flex-1 resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            aria-label="Post"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {submitting ? (
              <span className="text-xs">…</span>
            ) : (
              <SendIcon className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Ctrl+Enter to send
        </p>
      </form>
    </Card>
  )
}
