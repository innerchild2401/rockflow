'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { moveDocumentAction, deleteDocumentAction } from '@/app/actions/documents'

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes === 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentView({
  companyId,
  documentId,
  slug,
  title,
  content,
  fileName,
  fileSizeBytes,
  fileType,
  currentFolderId,
  folders,
  canEdit,
  canDelete,
}: {
  companyId: string
  documentId: string
  slug: string
  title: string
  content: string
  fileName: string | null
  fileSizeBytes: number | null
  fileType: string | null
  currentFolderId: string | null
  folders: { id: string; name: string }[]
  canEdit: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onDownload() {
    const mime = fileType && fileType.trim() ? fileType : 'text/plain;charset=utf-8'
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName && fileName.trim() ? fileName : `${title.replace(/[^a-z0-9.-]/gi, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function onMove(folderId: string) {
    if (!canEdit) return
    const value = folderId === '' ? null : folderId
    if (value === currentFolderId) return
    setMoving(true)
    setError(null)
    const r = await moveDocumentAction(companyId, documentId, value)
    setMoving(false)
    if (r.error) setError(r.error)
    else router.refresh()
  }

  async function onDelete() {
    if (!canDelete || !confirm('Delete this document? This cannot be undone.')) return
    const r = await deleteDocumentAction(companyId, documentId)
    if (r.error) setError(r.error)
    else router.push(`/dashboard/companies/${slug}/documents`)
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </div>
      )}
      {(fileName || fileSizeBytes != null) && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {fileName && <span>{fileName}</span>}
          {fileName && fileSizeBytes != null && ' · '}
          {fileSizeBytes != null && <span>{formatFileSize(fileSizeBytes)}</span>}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-700">
        <button
          type="button"
          onClick={onDownload}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Download
        </button>
        {canEdit && folders.length > 0 && (
          <select
            value={currentFolderId ?? ''}
            onChange={(e) => onMove(e.target.value)}
            disabled={moving}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
          >
            Delete
          </button>
        )}
      </div>
      <div className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
        {content || 'No content.'}
      </div>
    </div>
  )
}
