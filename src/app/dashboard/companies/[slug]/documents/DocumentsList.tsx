'use client'

import Link from 'next/link'
import { FolderIcon, DocumentIcon } from './DocumentsToolbar'

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes === 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsList({
  slug,
  subfolders,
  documents,
  currentFolderId,
}: {
  slug: string
  subfolders: { id: string; name: string }[]
  documents: { id: string; title: string; updated_at: string; file_name: string | null; file_size_bytes: number | null }[]
  currentFolderId: string | null
}) {
  const baseHref = `/dashboard/companies/${slug}/documents`
  const formatDate = (s: string) => new Date(s).toLocaleDateString()
  const isEmpty = subfolders.length === 0 && documents.length === 0

  return (
    <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
      {currentFolderId && (
        <Link
          href={baseHref}
          className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
        >
          <svg className="h-5 w-5 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Up to Documents
        </Link>
      )}

      {subfolders.map((f) => (
        <Link
          key={f.id}
          href={`${baseHref}?folder=${f.id}`}
          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800/50"
        >
          <FolderIcon />
          <span className="min-w-0 flex-1 truncate">{f.name}</span>
          <span className="text-zinc-400 dark:text-zinc-500" aria-hidden>Folder</span>
        </Link>
      ))}

      {documents.map((d) => (
        <Link
          key={d.id}
          href={`${baseHref}/${d.id}`}
          className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-900 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800/50"
        >
          <DocumentIcon />
          <span className="min-w-0 flex-1 truncate">{d.title}</span>
          <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
            {formatDate(d.updated_at)}
            {d.file_size_bytes != null ? ` · ${formatFileSize(d.file_size_bytes)}` : ''}
          </span>
        </Link>
      ))}

      {isEmpty && (
        <div className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {currentFolderId ? 'No documents in this folder.' : 'No folders or documents yet. Create a folder or upload files.'}
        </div>
      )}
    </div>
  )
}
