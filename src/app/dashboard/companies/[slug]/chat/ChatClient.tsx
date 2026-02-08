'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { submitChatAction } from '@/app/actions/chat'
import type { Citation } from '@/app/actions/chat'
import { SendIcon } from '@/components/ui/SendIcon'

type Message = {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}

export default function ChatClient({
  companyId,
  slug,
}: { companyId: string; slug: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)
    const history = messages.map((m) => ({ role: m.role, content: m.content }))
    const r = await submitChatAction(companyId, text, history)
    setLoading(false)
    if (r.error) {
      setError(r.error)
      setMessages((prev) => prev.slice(0, -1))
      return
    }
    if (r.reply != null) {
      const reply: string = r.reply
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, citations: r.citations ?? [] }])
    }
  }

  return (
    <div className="flex min-h-[50dvh] flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sm:min-h-[360px]">
      <div className="flex min-h-[200px] flex-1 flex-col gap-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Ask a question. Answers are based only on your company documents and include links to sources.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200'
              }`}
            >
              <span className="whitespace-pre-wrap">{m.content}</span>
              {m.role === 'assistant' && m.citations && m.citations.length > 0 && (
                <div className="mt-3 border-t border-zinc-200 pt-2 dark:border-zinc-600">
                  <p className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">Sources</p>
                  <ul className="space-y-1 text-xs">
                    {m.citations.slice(0, 3).map((cit, j) => (
                      <li key={j}>
                        <Link
                          href={`/dashboard/companies/${slug}/documents/${cit.document_id}?chunk=${cit.chunk_index}`}
                          className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {cit.document_title}
                          {cit.chunk_index >= 0 ? ` (paragraph ${cit.chunk_index + 1})` : ''}
                        </Link>
                        {cit.content_snippet && (
                          <p className="mt-0.5 truncate text-zinc-500 dark:text-zinc-400" title={cit.content_snippet}>
                            {cit.content_snippet}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              …
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={onSubmit} className="shrink-0 border-t border-zinc-200 p-4 dark:border-zinc-700">
        {error && (
          <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your documents…"
            disabled={loading}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
