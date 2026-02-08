'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { detachDocumentFromTaskAction } from '@/app/actions/task-collaboration'
import { useToast } from '@/lib/toast'
import { ToastContainer } from '@/components/ui/Toast'
import AttachDocumentMenu from './AttachDocumentMenu'

type Document = {
  id: string
  title: string
  file_name: string | null
  attached_by?: string
  attached_at?: string | null
}

export default function AttachmentsPanel({
  companyId,
  taskId,
  slug,
  attachments,
  canEdit,
  availableDocuments,
}: {
  companyId: string
  taskId: string
  slug: string
  attachments: Document[]
  canEdit: boolean
  availableDocuments: { id: string; title: string; file_name: string | null }[]
}) {
  const router = useRouter()
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toasts, addToast, removeToast } = useToast()

  const documentsNotAttached = availableDocuments.filter((d) => !attachments.some((a) => a.id === d.id))

  function onAttachDocument(documentId: string) {
    setShowAttachMenu(false)
    addToast('Document attached', 'success')
    router.refresh()
  }

  async function onDetachDocument(documentId: string) {
    if (!confirm('Remove this document from the task?')) return
    setLoading(true)
    const r = await detachDocumentFromTaskAction(companyId, taskId, documentId)
    setLoading(false)
    if (r.error) {
      addToast(r.error, 'error')
    } else {
      addToast('Document removed', 'success')
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="shrink-0 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Attachments</h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Documents linked to this task.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {attachments.length === 0 && !canEdit && (
          <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No attachments.</p>
        )}
        {attachments.length === 0 && canEdit && (
          <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No attachments yet.</p>
        )}
        {attachments.length > 0 && (
          <ul className="space-y-2">
            {attachments.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/dashboard/companies/${slug}/documents/${doc.id}?returnTo=/dashboard/companies/${slug}/tasks/${taskId}`}
                    className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                  >
                    {doc.file_name || doc.title}
                  </Link>
                  {doc.attached_by && (
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">by {doc.attached_by}</p>
                  )}
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onDetachDocument(doc.id)}
                    disabled={loading}
                    className="shrink-0 rounded p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300 disabled:opacity-50"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {canEdit && (
        <div className="shrink-0 border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              disabled={loading || documentsNotAttached.length === 0}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              + Attach document
            </button>
            {showAttachMenu && (
              <AttachDocumentMenu
                companyId={companyId}
                taskId={taskId}
                documents={documentsNotAttached}
                onAttach={onAttachDocument}
                onClose={() => setShowAttachMenu(false)}
              />
            )}
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
