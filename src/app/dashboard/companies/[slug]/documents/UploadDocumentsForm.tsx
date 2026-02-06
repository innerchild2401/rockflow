'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createDocumentsFromFormDataAction } from '@/app/actions/documents'
import { isAllowedDocumentFilename, UPLOAD_ACCEPT, UPLOAD_EXTENSIONS_LABEL, MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from '@/lib/upload-types'

export default function UploadDocumentsForm(props: {
  companyId: string
  slug: string
  folders: { id: string; parent_folder_id: string | null; name: string }[]
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [folderId, setFolderId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ created: number; skipped: string[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  async function processFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    setLoading(true)
    setError(null)
    setResult(null)
    const validFiles: File[] = []
    const skipped: string[] = []
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      if (!isAllowedDocumentFilename(file.name)) {
        skipped.push(file.name)
        continue
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        skipped.push(`${file.name} (over ${MAX_UPLOAD_LABEL} limit)`)
        continue
      }
      validFiles.push(file)
    }
    if (validFiles.length === 0) {
      setError(skipped.length ? `No valid files. Allowed: ${UPLOAD_EXTENSIONS_LABEL}. Skipped: ${skipped.join(', ')}` : 'No files selected or all skipped.')
      setLoading(false)
      return
    }
    const formData = new FormData()
    formData.set('companyId', props.companyId)
    formData.set('folderId', folderId || '')
    validFiles.forEach((f) => formData.append('files', f))
    try {
      const r = await createDocumentsFromFormDataAction(formData)
      setLoading(false)
      if (r.error) setError(r.error)
      else {
        setResult({ created: r.created, skipped: [...skipped, ...(r.skipped ?? [])] })
        if (inputRef.current) inputRef.current.value = ''
        router.refresh()
      }
    } catch (e) {
      setLoading(false)
      setError(`Upload failed. Files must be under ${MAX_UPLOAD_LABEL} each, or the connection was interrupted. Try a smaller file.`)
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    processFiles(e.target.files)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    processFiles(e.dataTransfer.files)
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function onDragLeave() {
    setDragOver(false)
  }

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Allowed types: <strong>{UPLOAD_EXTENSIONS_LABEL}</strong>. Max <strong>{MAX_UPLOAD_LABEL}</strong> per file. Multiple files supported.
      </p>
      {props.folders.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Folder</label>
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">None</option>
            {props.folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      )}
      <label
        htmlFor="upload-docs"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`block cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragOver
            ? 'border-zinc-400 bg-zinc-100 dark:border-zinc-500 dark:bg-zinc-800'
            : 'border-zinc-300 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-800/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={UPLOAD_ACCEPT}
          onChange={onInputChange}
          disabled={loading}
          className="sr-only"
          id="upload-docs"
        />
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Drop files here or click to browse
        </span>
        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
          Max {MAX_UPLOAD_LABEL} per file
        </span>
      </label>
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </div>
      )}
      {result && result.created > 0 && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/50 dark:text-green-200">
          {result.created} document{result.created !== 1 ? 's' : ''} created.
          {result.skipped.length > 0 && (
            <span className="mt-1 block text-green-700 dark:text-green-300">
              Skipped (wrong type or error): {result.skipped.join(', ')}
            </span>
          )}
        </div>
      )}
      {loading && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Uploading…</p>
      )}
    </div>
  )
}
