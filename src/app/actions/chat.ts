'use server'

import { createClient } from '@/lib/supabase/server'
import { canReadDocuments } from '@/lib/permissions'
import { embedText, chat as openaiChat } from '@/lib/openai'
import type { ChatMessage } from '@/lib/openai'

const APP_SCHEMA = 'app'
const MATCH_COUNT = 10

export async function submitChatAction(
  companyId: string,
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[]
) {
  if (!(await canReadDocuments(companyId)))
    return { error: 'No permission to use chat.', reply: null }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', reply: null }

  let queryEmbedding: number[]
  try {
    queryEmbedding = await embedText(userMessage)
  } catch (e) {
    return { error: 'Failed to embed query. Check OPENAI_API_KEY.', reply: null }
  }

  const embeddingStr = `[${queryEmbedding.join(',')}]`
  const { data: chunks, error: rpcError } = await supabase
    .schema(APP_SCHEMA)
    .rpc('match_document_chunks', {
      query_embedding_text: embeddingStr,
      p_company_id: companyId,
      match_count: MATCH_COUNT,
      match_threshold: 0,
    })

  if (rpcError) return { error: rpcError.message, reply: null }

  const contextParts = (chunks ?? []) as { content: string }[]
  const context = contextParts.length
    ? contextParts.map((c) => c.content).join('\n\n---\n\n')
    : 'No relevant documents found for this company.'

  const systemContent = `You are a helpful assistant. Answer based only on the following context from the company's documents. If the context does not contain relevant information, say so. Do not make up facts.\n\nContext:\n${context}`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemContent },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ]

  let reply: string
  try {
    reply = await openaiChat(messages)
  } catch (e) {
    return { error: 'Failed to get reply from model.', reply: null }
  }

  return { error: null, reply }
}
