'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateDocumentAction, deleteDocumentAction } from '@/app/actions/documents'

export default function DocumentEditor({
  companyId,
  documentId,
  slug,
  initialTitle,
  initialContent,
  canEdit,
}: {
  companyId: string
  documentId: string
  slug: string
  initialTitle: string
  initialContent: string
  canEdit: boolean
}) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    setLoading(true)
    setError(null)
    const r = await updateDocumentAction(companyId, documentId, title, content)
    setLoading(false)
    if (r.error) setError(r.error)
    else router.refresh()
  }

  async function onDelete() {
    if (!canEdit || !confirm('Delete this document?')) return
    const r = await deleteDocumentAction(companyId, documentId)
    if (r.error) alert(r.error)
    else router.push(`/dashboard/companies/${slug}/documents`)
    router.refresh()
  }

  if (!canEdit) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{content || 'No content.'}</div>
      </div>
    )
  }

  return (
    <form onSubmit={onSave} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50" />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Content</label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={16} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50" />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">Save</button>
        <button type="button" onClick={onDelete} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/50">Delete</button>
      </div>
    </form>
  )
}
