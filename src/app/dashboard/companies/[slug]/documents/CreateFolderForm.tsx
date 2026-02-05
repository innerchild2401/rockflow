'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createFolderAction } from '@/app/actions/documents'

export default function CreateFolderForm(props: {
  companyId: string
  slug: string
  parentFolderId: string | null
  folders: { id: string; parent_folder_id: string | null; name: string }[]
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const r = await createFolderAction(props.companyId, name, props.parentFolderId)
    setLoading(false)
    if (r.error) setError(r.error)
    else {
      setName('')
      router.refresh()
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-end gap-3">
      {error && <div className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Folder name" required className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      <button type="submit" disabled={loading} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">{loading ? 'Creating…' : 'Create folder'}</button>
    </form>
  )
}
