'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { PendingInvitesToast } from './PendingInvitesToast'

export type Company = { id: string; name: string; slug: string }
export type Profile = { id: string; display_name: string | null; email: string | null }

export function AppShell({
  companies,
  profile,
  pendingInviteCount = 0,
  children,
}: {
  companies: Company[]
  profile: Profile
  pendingInviteCount?: number
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const isCompanyContext = pathname?.match(/^\/dashboard\/companies\/([^/]+)/)
  const currentSlug = isCompanyContext?.[1] ?? null
  const currentCompany = companies.find((c) => c.slug === currentSlug)

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <TopBar
        profile={profile}
        currentCompany={currentCompany ?? null}
        onMenuClick={() => setSidebarOpen((o) => !o)}
      />
      <Sidebar
        companies={companies}
        currentSlug={currentSlug}
        currentCompany={currentCompany ?? null}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingInviteCount={pendingInviteCount}
      />
      <main className="pl-0 lg:pl-64">
        <div className="min-h-[calc(100vh-3.5rem)] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-zinc-900/20 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <PendingInvitesToast pendingInviteCount={pendingInviteCount} />
    </div>
  )
}
