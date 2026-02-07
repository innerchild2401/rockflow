import Link from 'next/link'
import { Card } from '@/components/ui/Card'

export function NoPermission({
  title = "You don't have permission to access this",
  description = "Ask an admin to grant you access, or switch to a different company.",
  backHref = '/dashboard',
  backLabel = 'Dashboard',
}: {
  title?: string
  description?: string
  backHref?: string
  backLabel?: string
}) {
  return (
    <div className="mx-auto max-w-md">
      <Card className="text-center">
        <div className="py-6">
          <p className="font-medium text-zinc-900 dark:text-zinc-50">{title}</p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
          <Link
            href={backHref}
            className="mt-6 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {backLabel}
          </Link>
        </div>
      </Card>
    </div>
  )
}
