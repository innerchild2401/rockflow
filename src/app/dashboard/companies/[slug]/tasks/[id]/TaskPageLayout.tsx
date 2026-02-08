'use client'

import { useState } from 'react'

type TabId = 'details' | 'attachments' | 'chat'

export default function TaskPageLayout({
  detailsSlot,
  attachmentsSlot,
  chatTabSlot,
  chatFullSlot,
}: {
  detailsSlot: React.ReactNode
  attachmentsSlot: React.ReactNode
  chatTabSlot: React.ReactNode
  chatFullSlot: React.ReactNode
}) {
  const [activeTab, setActiveTab] = useState<TabId>('details')

  const tabs: { id: TabId; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'attachments', label: 'Attachments' },
    { id: 'chat', label: 'Chat' },
  ]

  return (
    <>
      {/* Mobile/tablet: tabs at top + tab content fills remaining viewport */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
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
            /* Fixed height on mobile so chat area is bounded and input sticks to bottom (dashboard main doesn't constrain height) */
            <div className="flex h-[calc(100dvh-12rem)] min-h-[280px] min-w-0 flex-col overflow-hidden sm:h-[calc(100dvh-11rem)]">
              {chatTabSlot}
            </div>
          )}
        </div>
      </div>

      {/* Desktop: two-column grid */}
      <div className="hidden gap-4 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-3">
        <div className="min-w-0 overflow-auto lg:col-span-1">
          {detailsSlot}
        </div>
        <div className="min-h-[55dvh] min-w-0 sm:min-h-[60dvh] lg:col-span-2 lg:min-h-0">
          {chatFullSlot}
        </div>
      </div>
    </>
  )
}
