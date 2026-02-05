'use client'

import { useState, useRef, useEffect } from 'react'
import { submitChatAction } from '@/app/actions/chat'

type Message = { role: 'user' | 'assistant'; content: string }

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
    if (r.reply) {
      setMessages((prev) => [...prev, { role: 'assistant', content: r.reply }])
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex min-h-[320px] flex-1 flex-col gap-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Ask a question about your documents.
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
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
              }`}
            >
              <span className="whitespace-pre-wrap">{m.content}</span>
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
      <form onSubmit={onSubmit} className="border-t border-zinc-200 p-4 dark:border-zinc-700">
        {error && (
          <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </div>
        )}
        <div className="flex gap-2">
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
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
