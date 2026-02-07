'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { SendIcon } from '@/components/ui/SendIcon'
import { getCompanyFeedAction, postCompanyFeedAction, type FeedPost } from '@/app/actions/company-feed'

export default function CompanyFeed({ companyId, currentUserId }: { companyId: string; currentUserId: string }) {
  const router = useRouter()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [postError, setPostError] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  async function loadFeed() {
    setLoading(true)
    const r = await getCompanyFeedAction(companyId)
    setLoading(false)
    if (r.error) return
    setPosts(r.posts)
  }

  useEffect(() => {
    loadFeed()
  }, [companyId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    setPostError(null)
    const r = await postCompanyFeedAction(companyId, trimmed)
    setSubmitting(false)
    if (r.error) {
      setPostError(r.error)
      return
    }
    setBody('')
    await loadFeed()
    router.refresh()
  }

  return (
    <Card padding="none" className="flex min-h-[50dvh] flex-col overflow-hidden sm:min-h-[280px]">
      <div className="shrink-0 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700 sm:px-6 sm:py-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Team feed</h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Share what you&apos;re working on, ask for help, or post updates.
        </p>
      </div>
      <div ref={listRef} className="min-h-[200px] flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
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
        {!loading && posts.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No posts yet. Be the first to share!
          </p>
        )}
        {!loading && posts.length > 0 && (
          <ul className="space-y-4">
            {posts.map((post) => {
              const isOwn = post.user_id === currentUserId
              return (
                <li
                  key={post.id}
                  className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                    {post.author_name.charAt(0).toUpperCase()}
                  </div>
                  <div
                    className={`min-w-0 max-w-[85%] rounded-lg px-3 py-2 ${
                      isOwn
                        ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
                        : 'bg-zinc-100 dark:bg-zinc-800'
                    }`}
                  >
                    <div className={`flex flex-wrap items-baseline gap-2 ${isOwn ? 'flex-row-reverse justify-end' : ''}`}>
                      <span className="text-sm font-medium">
                        {post.author_name}
                      </span>
                      <span className="text-xs opacity-80">
                        {new Date(post.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className={`mt-0.5 whitespace-pre-wrap text-sm ${isOwn ? 'text-right' : ''}`}>
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
        className="shrink-0 border-t border-zinc-200 px-4 py-3 dark:border-zinc-700 sm:px-6"
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
