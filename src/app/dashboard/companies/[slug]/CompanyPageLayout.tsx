'use client'

import { useState } from 'react'
import CompanyRecapCard from './CompanyRecapCard'
import CompanyFeed from './CompanyFeed'

type TabId = 'feed' | 'recap'

export default function CompanyPageLayout({
  companyId,
  currentUserId,
}: {
  companyId: string
  currentUserId: string
}) {
  const [activeTab, setActiveTab] = useState<TabId>('feed')
  const [feedNewCount, setFeedNewCount] = useState(0)

  return (
    <>
      {/* Mobile: tabs at top, content fills viewport below */}
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex">
            <button
              type="button"
              onClick={() => setActiveTab('feed')}
              className={`flex flex-1 items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'feed'
                  ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
              }`}
            >
              Feed
              {feedNewCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-teal-600 px-1.5 text-xs font-medium text-white dark:bg-teal-500">
                  {feedNewCount > 99 ? '99+' : feedNewCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('recap')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'recap'
                  ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
              }`}
            >
              Recap
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTab === 'feed' && (
            /* Fixed height on mobile so feed area is bounded and input sticks to bottom (dashboard main doesn't constrain height) */
            <div className="flex h-[calc(100dvh-12rem)] min-h-[280px] min-w-0 flex-col overflow-hidden sm:h-[calc(100dvh-11rem)]">
              <CompanyFeed
                companyId={companyId}
                currentUserId={currentUserId}
                embeddedInTab
                onNewCountChange={setFeedNewCount}
              />
            </div>
          )}
          {activeTab === 'recap' && (
            <div className="h-full overflow-y-auto">
              <CompanyRecapCard companyId={companyId} />
            </div>
          )}
        </div>
      </div>

      {/* Desktop: stacked Recap then Feed */}
      <div className="hidden space-y-8 md:block">
        <CompanyRecapCard companyId={companyId} />
        <CompanyFeed companyId={companyId} currentUserId={currentUserId} />
      </div>
    </>
  )
}
