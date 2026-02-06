'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { getCompanyRecapAction } from '@/app/actions/company-recap'

const REFRESH_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

export default function CompanyRecapCard({ companyId }: { companyId: string }) {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodStart, setPeriodStart] = useState<string | null>(null)

  const fetchRecap = useCallback(async () => {
    setLoading(true)
    setError(null)
    const r = await getCompanyRecapAction(companyId)
    setLoading(false)
    if (r.error) setError(r.error)
    else {
      setContent(r.content ?? null)
      setPeriodStart(r.periodStart ?? null)
    }
  }, [companyId])

  useEffect(() => {
    fetchRecap()
  }, [fetchRecap])

  useEffect(() => {
    const t = setInterval(fetchRecap, REFRESH_INTERVAL_MS)
    return () => clearInterval(t)
  }, [fetchRecap])

  const updatedAt = periodStart
    ? new Date(periodStart).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Past hour</h2>
          {updatedAt && !loading && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Updated at {updatedAt}</span>
          )}
        </div>
      </div>
      <div className="px-6 py-4">
        {loading && (
          <div className="space-y-2" aria-hidden>
            <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-4 w-[80%] animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-4 w-[60%] animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          </div>
        )}
        {error && !loading && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {content && !loading && !error && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 transition-opacity duration-300">
            {content}
          </p>
        )}
      </div>
    </Card>
  )
}
