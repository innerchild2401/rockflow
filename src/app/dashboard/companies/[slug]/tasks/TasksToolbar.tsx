'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import CreateTaskModal from './CreateTaskModal'

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

export default function TasksToolbar({
  companyId,
  slug,
  members,
  canCreate,
}: {
  companyId: string
  slug: string
  members: { id: string; display_name: string | null; email: string }[]
  canCreate: boolean
}) {
  const [showCreateModal, setShowCreateModal] = useState(false)

  if (!canCreate) return null

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Tasks</h2>
        <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)}>
          <PlusIcon />
          New task
        </Button>
      </div>
      {showCreateModal && (
        <CreateTaskModal
          companyId={companyId}
          slug={slug}
          members={members}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  )
}
