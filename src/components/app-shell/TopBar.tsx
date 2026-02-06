'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Company } from './AppShell'
import type { Profile } from './AppShell'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'

function Breadcrumbs({ slug, segment }: { slug: string | null; segment: string | null }) {
  if (!slug) return null
  const labels: Record<string, string> = {
    documents: 'Documents',
    tasks: 'Tasks',
    chat: 'Chat',
    audit: 'Audit log',
    members: 'Members',
  }
  const label = segment ? labels[segment] ?? segment : null
  return (
    <nav className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
      <Link href={`/dashboard/companies/${slug}`} className="hover:text-zinc-900 dark:hover:text-zinc-50">
        Company
      </Link>
      {label && (
        <>
          <span aria-hidden>/</span>
          <span className="text-zinc-900 dark:text-zinc-50">{label}</span>
        </>
      )}
    </nav>
  )
}

export function TopBar({
  profile,
  currentCompany,
  onMenuClick,
}: {
  profile: Profile
  currentCompany: Company | null
  onMenuClick: () => void
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const match = pathname?.match(/^\/dashboard\/companies\/([^/]+)(?:\/([^/]+))?/)
  const slug = match?.[1] ?? null
  const segment = match?.[2] ?? null

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const displayName = profile?.display_name ?? profile?.email ?? 'Account'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/95 dark:supports-[backdrop-filter]:bg-zinc-900/80 sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/dashboard" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 shrink-0">
          RockFlow
        </Link>
        <div className="hidden lg:block">
          <Breadcrumbs slug={slug} segment={segment} />
        </div>
      </div>

      <div className="relative flex items-center gap-2" ref={menuRef}>
        {currentCompany && (
          <NotificationCenter companyId={currentCompany.id} companySlug={currentCompany.slug} />
        )}
        <button
          type="button"
          onClick={() => setUserMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-expanded={userMenuOpen}
          aria-haspopup="true"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden sm:inline max-w-[120px] truncate">{displayName}</span>
          <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {userMenuOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{displayName}</p>
              {profile?.email && (
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{profile.email}</p>
              )}
            </div>
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  )
}
