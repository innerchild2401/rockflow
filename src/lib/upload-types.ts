/**
 * Allowed file types for document upload.
 * Only text-based formats are supported (content is stored in documents.content and used for RAG).
 */

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.json',
  '.html',
  '.htm',
  '.xml',
  '.log',
  '.yml',
  '.yaml',
  '.pdf',
  '.doc',
  '.docx',
] as const

export const ALLOWED_DOCUMENT_ACCEPT = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'text/html',
  'application/xml',
  'text/xml',
  'application/yaml',
  'text/yaml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',')

/** Accept attribute for file input (extensions + MIME). */
export const UPLOAD_ACCEPT = `${ALLOWED_DOCUMENT_EXTENSIONS.join(',')},${ALLOWED_DOCUMENT_ACCEPT}`

/** Human-readable list for UI. */
export const UPLOAD_EXTENSIONS_LABEL = 'TXT, MD, CSV, JSON, HTML, XML, LOG, YAML, PDF, DOC, DOCX'

export function isAllowedDocumentFilename(name: string): boolean {
  const lower = name.toLowerCase()
  return ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => lower.endsWith(ext) || lower === ext.slice(1))
}

export function getDocumentTitleFromFilename(name: string): string {
  const lastDot = name.lastIndexOf('.')
  return lastDot > 0 ? name.slice(0, lastDot) : name
}
