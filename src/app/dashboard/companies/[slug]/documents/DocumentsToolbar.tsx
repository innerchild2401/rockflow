'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { createFolderAction } from '@/app/actions/documents'
import { createDocumentsFromFormDataAction } from '@/app/actions/documents'
import { isAllowedDocumentFilename, UPLOAD_ACCEPT, MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from '@/lib/upload-types'

const FolderIcon = () => (
  <svg className="h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
)
const DocumentIcon = () => (
  <svg className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)
const UploadIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
)
const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

export default function DocumentsToolbar({
  slug,
  companyId,
  currentFolderId,
  currentFolderName,
  canManageFolder,
  canCreate,
}: {
  slug: string
  companyId: string
  currentFolderId: string | null
  currentFolderName: string | null
  canManageFolder: boolean
  canCreate: boolean
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [folderLoading, setFolderLoading] = useState(false)
  const [folderError, setFolderError] = useState<string | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<number | null>(null)

  const baseHref = `/dashboard/companies/${slug}/documents`

  async function onCreateFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!newFolderName.trim()) return
    setFolderLoading(true)
    setFolderError(null)
    const r = await createFolderAction(companyId, newFolderName.trim(), currentFolderId)
    setFolderLoading(false)
    if (r.error) setFolderError(r.error)
    else {
      setNewFolderName('')
      setShowNewFolder(false)
      router.refresh()
    }
  }

  async function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setUploadLoading(true)
    setUploadError(null)
    setUploadSuccess(null)
    const valid: File[] = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      if (isAllowedDocumentFilename(f.name) && f.size <= MAX_UPLOAD_BYTES) valid.push(f)
    }
    if (valid.length === 0) {
      setUploadError('No valid files or all over ' + MAX_UPLOAD_LABEL)
      setUploadLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    const formData = new FormData()
    formData.set('companyId', companyId)
    formData.set('folderId', currentFolderId || '')
    valid.forEach((f) => formData.append('files', f))
    try {
      const r = await createDocumentsFromFormDataAction(formData)
      if (r.error) setUploadError(r.error)
      else {
        setUploadSuccess(r.created)
        router.refresh()
      }
    } catch {
      setUploadError('Upload failed. Try a smaller file.')
    }
    setUploadLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <nav className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href={baseHref} className="hover:text-zinc-900 dark:hover:text-zinc-100">
            Documents
          </Link>
          {currentFolderName && (
            <>
              <span aria-hidden>/</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{currentFolderName}</span>
            </>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {canManageFolder && (
            <Button variant="outline" size="sm" onClick={() => setShowNewFolder((v) => !v)}>
              <PlusIcon />
              New folder
            </Button>
          )}
          {canCreate && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={UPLOAD_ACCEPT}
                onChange={onFilesSelected}
                className="sr-only"
                id="documents-upload-input"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLoading}
                isLoading={uploadLoading}
              >
                <UploadIcon />
                {uploadLoading ? 'Uploading…' : 'Upload'}
              </Button>
            </>
          )}
        </div>
      </div>

      {showNewFolder && canManageFolder && (
        <form onSubmit={onCreateFolder} className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            required
            className="min-w-[160px] rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
            autoFocus
          />
          <Button type="submit" size="sm" disabled={folderLoading} isLoading={folderLoading}>
            Create
          </Button>
          <button type="button" onClick={() => { setShowNewFolder(false); setFolderError(null); }} className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400">
            Cancel
          </button>
          {folderError && <span className="text-sm text-red-600 dark:text-red-400">{folderError}</span>}
        </form>
      )}

      {uploadError && <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>}
      {uploadSuccess != null && uploadSuccess > 0 && (
        <p className="text-sm text-green-700 dark:text-green-400">{uploadSuccess} file{uploadSuccess !== 1 ? 's' : ''} uploaded.</p>
      )}
    </div>
  )
}

export { FolderIcon, DocumentIcon }
