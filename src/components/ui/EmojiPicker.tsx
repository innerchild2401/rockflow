'use client'

import { useState, useRef, useEffect } from 'react'

const COMMON_EMOJIS = [
  '👍', '👎', '❤️', '🎉', '😄', '😮', '😢', '🔥',
  '👏', '🙏', '💯', '✅', '❌', '⭐', '💡', '🚀',
]

export function EmojiPicker({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void
  onClose: () => void
}) {
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-0 z-50 mb-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="grid grid-cols-4 gap-3">
        {COMMON_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              onSelect(emoji)
              onClose()
            }}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-2xl leading-normal hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
