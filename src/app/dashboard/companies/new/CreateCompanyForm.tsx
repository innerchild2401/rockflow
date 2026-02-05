'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCompanyAction } from '@/app/actions/companies'

export default function CreateCompanyForm({ userId, createdBy }: { userId: string; createdBy: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function slugFromName(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function handleNameChange(value: string) {
    setName(value)
    setSlug(slugFromName(value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await createCompanyAction({ name, slug, createdBy, userId })
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.push(`/dashboard/companies/${result.slug ?? slug}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">{error}</div>}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Company name</label>
        <input id="name" type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} required className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50" />
      </div>
      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">URL slug</label>
        <input id="slug" type="text" value={slug} onChange={(e) => setSlug(e.target.value)} required className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50" />
      </div>
      <button type="submit" disabled={loading} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
        {loading ? 'Creating…' : 'Create company'}
      </button>
    </form>
  )
}
