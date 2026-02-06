'use server'

import { createClient } from '@/lib/supabase/server'
import { canReadDocuments } from '@/lib/permissions'
import { embedText, chat as openaiChat } from '@/lib/openai'
import type { ChatMessage } from '@/lib/openai'

const APP_SCHEMA = 'app'
const MATCH_COUNT = 10
const MATCH_THRESHOLD = 0.2 // Minimum similarity (0–1); filters weak matches

export type Citation = {
  document_id: string
  document_title: string
  chunk_index: number
  content_snippet: string
  similarity: number
}

export async function submitChatAction(
  companyId: string,
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<{ error: string | null; reply: string | null; citations: Citation[] }> {
  if (!(await canReadDocuments(companyId)))
    return { error: 'No permission to use Knowledge Base.', reply: null, citations: [] }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', reply: null, citations: [] }

  let queryEmbedding: number[]
  try {
    queryEmbedding = await embedText(userMessage)
  } catch (e) {
    return { error: 'Failed to embed query. Check OPENAI_API_KEY.', reply: null, citations: [] }
  }

  const embeddingStr = `[${queryEmbedding.join(',')}]`
  const { data: chunks, error: rpcError } = await supabase
    .schema(APP_SCHEMA)
    .rpc('match_document_chunks', {
      query_embedding_text: embeddingStr,
      p_company_id: companyId,
      match_count: MATCH_COUNT,
      match_threshold: MATCH_THRESHOLD,
    })

  if (rpcError) return { error: rpcError.message, reply: null, citations: [] }

  const chunkRows = (chunks ?? []) as { id: string; document_id: string; content: string; chunk_index: number; similarity: number }[]
  const documentIds = [...new Set(chunkRows.map((c) => c.document_id))]

  let documentTitles: Record<string, string> = {}
  if (documentIds.length > 0) {
    const { data: docs } = await supabase
      .schema(APP_SCHEMA)
      .from('documents')
      .select('id, title')
      .in('id', documentIds)
    for (const d of docs ?? []) {
      documentTitles[d.id] = d.title ?? 'Untitled'
    }
  }

  const citations: Citation[] = chunkRows.map((c) => ({
    document_id: c.document_id,
    document_title: documentTitles[c.document_id] ?? 'Untitled',
    chunk_index: c.chunk_index,
    content_snippet: c.content.slice(0, 200) + (c.content.length > 200 ? '…' : ''),
    similarity: c.similarity,
  }))

  const contextParts = chunkRows.map((c) => c.content)
  const context = contextParts.length
    ? contextParts.join('\n\n---\n\n')
    : ''

  const systemContent = context
    ? `You are a Knowledge Base assistant. You must answer ONLY using the following context from the company's documents. Do not use external knowledge or make up information.

Rules:
- If the answer is not in the context, reply exactly: "I couldn't find that in the available documents."
- Do not speculate or infer beyond what is written in the context.
- When answering, you may refer to the source by saying "According to the documents" or similar.
- Keep answers concise and grounded in the provided context.

Context:
${context}`
    : `You are a Knowledge Base assistant. The user asked a question but there are no relevant document chunks for this company. Reply with exactly: "I couldn't find that in the available documents." Do not attempt to answer from general knowledge.`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemContent },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ]

  let reply: string
  try {
    reply = await openaiChat(messages)
  } catch (e) {
    return { error: 'Failed to get reply from model.', reply: null, citations: [] }
  }

  return { error: null, reply, citations }
}
