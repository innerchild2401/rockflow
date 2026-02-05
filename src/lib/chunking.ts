/**
 * RAG pipeline: chunk document content for storage in document_chunks.
 * No external API keys; embeddings are left NULL until an embedding service is configured.
 */

export const DEFAULT_CHUNK_SIZE = 800
export const DEFAULT_OVERLAP = 100

export interface TextChunk {
  content: string
  index: number
}

/**
 * Split text into overlapping chunks suitable for RAG.
 * Uses character-based splitting; optional overlap to preserve context across boundaries.
 */
export function chunkText(
  text: string,
  options: { maxChunkSize?: number; overlap?: number } = {}
): TextChunk[] {
  const maxChunkSize = options.maxChunkSize ?? DEFAULT_CHUNK_SIZE
  const overlap = Math.min(options.overlap ?? DEFAULT_OVERLAP, maxChunkSize - 1)

  if (!text || text.trim().length === 0) return []

  const trimmed = text.trim()
  const chunks: TextChunk[] = []
  let start = 0
  let index = 0

  while (start < trimmed.length) {
    let end = start + maxChunkSize
    if (end < trimmed.length) {
      const lastSpace = trimmed.lastIndexOf(' ', end)
      if (lastSpace > start) end = lastSpace
    } else {
      end = trimmed.length
    }
    const content = trimmed.slice(start, end).trim()
    if (content) {
      chunks.push({ content, index })
      index++
    }
    start = end - (end < trimmed.length ? overlap : 0)
    if (start >= trimmed.length) break
  }

  return chunks
}
