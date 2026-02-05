'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDocumentAction } from '@/app/actions/documents'

export default function CreateDocumentForm(props: {
  companyId: string
  slug: string
  folders: { id: string; parent_folder_id: string | null; name: string }[]
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [folderId, setFolderId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const r = await createDocumentAction(props.companyId, title, folderId || null, '')
    setLoading(false)
    if (r.error) setError(r.error)
    else if (r.id) {
      router.push(`/dashboard/companies/${props.slug}/documents/${r.id}`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-zinc-700">Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" required className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      </div>
      {props.folders.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-zinc-700">Folder</label>
          <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="">None</option>
            {props.folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      )}
      <button type="submit" disabled={loading} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">{loading ? 'Creating…' : 'Create document'}</button>
    </form>
  )
}
