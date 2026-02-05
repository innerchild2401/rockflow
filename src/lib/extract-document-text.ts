/**
 * Server-only: extract plain text from PDF, DOC, DOCX for RAG.
 * Used when uploading documents; do not import from client.
 */

export type BinaryExtension = '.pdf' | '.doc' | '.docx'

export function isBinaryExtension(name: string): boolean {
  const lower = name.toLowerCase()
  return lower.endsWith('.pdf') || lower.endsWith('.doc') || lower.endsWith('.docx')
}

export async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.pdf')) {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return (data?.text ?? '').trim()
  }
  if (lower.endsWith('.docx')) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return (result?.value ?? '').trim()
  }
  if (lower.endsWith('.doc')) {
    const WordExtractor = (await import('word-extractor')).default
    const extractor = new WordExtractor()
    const doc = await extractor.extract(buffer)
    return (doc?.getBody?.() ?? '').trim()
  }
  return Buffer.from(buffer).toString('utf-8').trim()
}
