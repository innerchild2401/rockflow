/**
 * OpenAI client for embeddings (text-embedding-3-small, 1536 dims) and chat (gpt-4o-mini).
 * Requires OPENAI_API_KEY in env.
 */

import OpenAI from 'openai'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const CHAT_MODEL = 'gpt-4o-mini'

function getClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set')
  return new OpenAI({ apiKey: key })
}

export async function embedText(text: string): Promise<number[]> {
  const openai = getClient()
  const r = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8191),
  })
  const vec = r.data?.[0]?.embedding
  if (!vec || vec.length !== 1536) throw new Error('Invalid embedding response')
  return vec
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const openai = getClient()
  const r = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map((t) => t.slice(0, 8191)),
  })
  const sorted = (r.data ?? []).slice().sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
  return sorted.map((d) => d.embedding)
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export async function chat(messages: ChatMessage[]): Promise<string> {
  const openai = getClient()
  const r = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  })
  const content = r.choices?.[0]?.message?.content
  return content?.trim() ?? ''
}
