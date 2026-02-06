'use client'

import Link from 'next/link'

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes === 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsList({ slug, folders, documents, canEdit }: { slug: string; folders: { id: string; parent_folder_id: string | null; name: string }[]; documents: { id: string; folder_id: string | null; title: string; updated_at: string; file_name: string | null; file_size_bytes: number | null }[]; canEdit: boolean }) {
  const byFolder = documents.reduce((acc: Record<string, typeof documents>, d) => {
    const key = d.folder_id ?? '_root'
    if (!acc[key]) acc[key] = []
    acc[key].push(d)
    return acc
  }, {})
  const rootDocs = byFolder['_root'] ?? []
  const formatDate = (s: string) => new Date(s).toLocaleDateString()

  return (
    <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
      {rootDocs.length > 0 && (
        <div className="px-6 py-4">
          <p className="mb-2 text-xs font-medium uppercase text-zinc-400 dark:text-zinc-500">No folder</p>
          <ul className="space-y-1">
            {rootDocs.map((d) => (
              <li key={d.id}>
                <Link href={`/dashboard/companies/${slug}/documents/${d.id}`} className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50">{d.title}</Link>
                <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">{formatDate(d.updated_at)}{d.file_size_bytes != null ? ` · ${formatFileSize(d.file_size_bytes)}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {folders.map((f) => {
        const docs = byFolder[f.id] ?? []
        return (
          <div key={f.id} className="px-6 py-4">
            <p className="mb-2 text-xs font-medium uppercase text-zinc-400 dark:text-zinc-500">{f.name}</p>
            <ul className="space-y-1">
              {docs.length === 0 ? (
                <li className="text-xs text-zinc-400 dark:text-zinc-500">No documents in this folder</li>
              ) : (
                docs.map((d) => (
                  <li key={d.id}>
                    <Link href={`/dashboard/companies/${slug}/documents/${d.id}`} className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50">{d.title}</Link>
                    <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">{formatDate(d.updated_at)}{d.file_size_bytes != null ? ` · ${formatFileSize(d.file_size_bytes)}` : ''}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        )
      })}
      {documents.length === 0 && folders.length === 0 && <div className="px-6 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">No documents or folders yet.</div>}
    </div>
  )
}
