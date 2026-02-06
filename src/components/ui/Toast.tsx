'use client'

import { useEffect } from 'react'

export interface Toast {
  id: string
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
}

export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 sm:bottom-6 sm:right-6">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id)
    }, toast.duration ?? 5000)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const colors = {
    success: 'bg-green-50 text-green-800 border-green-200 dark:bg-green-950/50 dark:text-green-200 dark:border-green-800',
    error: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-200 dark:border-red-800',
    info: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800',
  }

  return (
    <div
      className={`min-w-[280px] max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg transition-all sm:min-w-[320px] ${
        colors[toast.type ?? 'info']
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1">{toast.message}</p>
        <button
          type="button"
          onClick={() => onRemove(toast.id)}
          className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  )
}
