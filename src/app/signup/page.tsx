'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    setLoading(false)
    if (err) {
      setMessage({ type: 'error', text: err.message })
      return
    }
    if (data.user?.identities?.length === 0) {
      setMessage({ type: 'error', text: 'An account with this email already exists.' })
      return
    }
    setMessage({
      type: 'success',
      text: 'Account created. Check your email to confirm, or sign in if you already confirmed.',
    })
    router.push(next)
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Rockflow
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Create your account
          </p>
        </div>
        <Card className="shadow-md" padding="lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            {message && (
              <div
                className={`rounded-lg px-3 py-2.5 text-sm ${
                  message.type === 'error'
                    ? 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200'
                    : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                }`}
              >
                {message.text}
              </div>
            )}
            <Input
              id="displayName"
              label="Display name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              placeholder="Your name"
            />
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@company.com"
            />
            <Input
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
              placeholder="••••••••"
            />
            <Button type="submit" className="w-full" size="lg" isLoading={loading} disabled={loading}>
              Sign up
            </Button>
          </form>
        </Card>
        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{' '}
          <Link href={next !== '/dashboard' ? `/login?next=${encodeURIComponent(next)}` : '/login'} className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
          <p className="text-sm text-zinc-500">Loading…</p>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  )
}
