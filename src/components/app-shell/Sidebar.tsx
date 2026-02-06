'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Company } from './AppShell'

export function Sidebar({
  companies,
  currentSlug,
  currentCompany,
  open,
  onClose,
}: {
  companies: Company[]
  currentSlug: string | null
  currentCompany: Company | null
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()
  const base = currentSlug ? `/dashboard/companies/${currentSlug}` : ''

  const companyNav = [
    { href: `${base}/documents`, label: 'Documents' },
    { href: `${base}/tasks`, label: 'Tasks' },
    { href: `${base}/tasks/calendar`, label: 'Calendar' },
    { href: `${base}/chat`, label: 'Knowledge Base' },
    { href: `${base}/audit`, label: 'Audit log' },
    { href: `${base}/members`, label: 'Members' },
  ]

  return (
    <aside
      className={`
        fixed left-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-64 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900
        transition-transform duration-200 ease-out lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      <nav className="flex h-full flex-col gap-1 overflow-y-auto p-4">
        <Link
          href="/dashboard"
          onClick={onClose}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
            pathname === '/dashboard' ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          Home
        </Link>
        <Link
          href="/dashboard/companies"
          onClick={onClose}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
            pathname === '/dashboard/companies' ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
        >
          Companies
        </Link>
        {companies.length > 0 && (
          <>
            <div className="my-2 border-t border-zinc-200 dark:border-zinc-700" />
            <p className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {currentSlug ? 'Switch company' : 'Your companies'}
            </p>
            {companies.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/companies/${c.slug}`}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                  currentSlug === c.slug ? 'bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-200 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                  {c.name.slice(0, 1).toUpperCase()}
                </span>
                {c.name}
              </Link>
            ))}
          </>
        )}
        {currentSlug && currentCompany && (
          <>
            <div className="my-2 border-t border-zinc-200 dark:border-zinc-700" />
            <p className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {currentCompany.name}
            </p>
            {companyNav.map((item) => {
              // Exact match: this nav item's href equals current path
              const exactMatch = pathname === item.href
              // Sub-path: current path is under this item (e.g. /tasks/123 under /tasks)
              const isSubPath = !exactMatch && item.href !== base && pathname?.startsWith(item.href + '/')
              // Another nav item is a better match: either exact (e.g. /tasks/calendar) or a longer path
              // So we don't highlight /tasks when we're on /tasks/calendar
              const hasMoreSpecificMatch = companyNav.some(
                (other) => other.href !== item.href && (pathname === other.href || (pathname?.startsWith(other.href + '/') ?? false))
              )
              const active = exactMatch || (isSubPath && !hasMoreSpecificMatch)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                    active ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </>
        )}
      </nav>
    </aside>
  )
}
