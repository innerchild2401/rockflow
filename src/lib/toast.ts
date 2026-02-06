'use client'

/**
 * Simple toast notification system.
 * Usage: const { toasts, addToast, removeToast } = useToast()
 */

import { useState, useCallback } from 'react'

export interface Toast {
  id: string
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, message, type, duration }])
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}
