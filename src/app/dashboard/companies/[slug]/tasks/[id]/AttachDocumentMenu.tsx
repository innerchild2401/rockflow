'use client'

import { useState, useEffect, useRef } from 'react'
import { attachDocumentToTaskAction } from '@/app/actions/task-collaboration'
import { Button } from '@/components/ui/Button'

export default function AttachDocumentMenu({
  companyId,
  taskId,
  documents,
  onAttach,
  onClose,
}: {
  companyId: string
  taskId: string
  documents: { id: string; title: string; file_name: string | null }[]
  onAttach: (documentId: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const filtered = documents.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.file_name?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAttach(documentId: string) {
    setLoading(documentId)
    const r = await attachDocumentToTaskAction(companyId, taskId, documentId)
    setLoading(null)
    if (!r.error) {
      onAttach(documentId)
      onClose()
    }
  }

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-0 mb-2 w-full max-w-md rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents…"
          autoFocus
          className="w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {search ? 'No documents found' : 'No documents available'}
          </div>
        ) : (
          filtered.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => handleAttach(doc.id)}
              disabled={loading === doc.id}
              className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              <div className="font-medium">{doc.file_name || doc.title}</div>
              {doc.file_name && doc.file_name !== doc.title && (
                <div className="text-xs text-zinc-500">{doc.title}</div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
