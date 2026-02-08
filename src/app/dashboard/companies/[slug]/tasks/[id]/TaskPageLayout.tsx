'use client'

import { useState } from 'react'
import Link from 'next/link'

type TabId = 'details' | 'attachments' | 'chat'

export default function TaskPageLayout({
  detailsSlot,
  attachmentsSlot,
  chatTabSlot,
  chatFullSlot,
  backHref,
  backLabel,
}: {
  detailsSlot: React.ReactNode
  attachmentsSlot: React.ReactNode
  chatTabSlot: React.ReactNode
  chatFullSlot: React.ReactNode
  backHref?: string
  backLabel?: string
}) {
  const [activeTab, setActiveTab] = useState<TabId>('details')

  const tabs: { id: TabId; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'attachments', label: 'Attachments' },
    { id: 'chat', label: 'Chat' },
  ]

  return (
    <>
      {/* Mobile/tablet: compact back row + tabs, then content fills viewport */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        {backHref && (
          <div className="shrink-0 border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              <span aria-hidden>←</span>
              {backLabel ?? 'Back'}
            </Link>
          </div>
        )}
        <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-50'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTab === 'details' && (
            <div className="h-full overflow-y-auto">
              {detailsSlot}
            </div>
          )}
          {activeTab === 'attachments' && (
            <div className="flex h-full min-h-0 flex-col">
              {attachmentsSlot}
            </div>
          )}
          {activeTab === 'chat' && (
            /* Flex-1 so chat expands to fill all space below tabs; input sticks to bottom */
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {chatTabSlot}
            </div>
          )}
        </div>
      </div>

      {/* Desktop: two-column grid — row height fixed so only chat list scrolls, not the page */}
      <div className="hidden gap-4 overflow-hidden lg:grid lg:min-h-0 lg:flex-1 lg:h-full lg:grid-cols-4 lg:grid-rows-1">
        <div className="min-h-0 min-w-0 overflow-auto lg:col-span-1">
          {detailsSlot}
        </div>
        <div className="min-h-0 min-w-0 lg:col-span-3 lg:overflow-hidden">
          {chatFullSlot}
        </div>
      </div>
    </>
  )
}
