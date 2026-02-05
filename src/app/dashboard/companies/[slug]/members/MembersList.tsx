'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateMemberRoleAction, removeMemberAction, setMemberPermissionsAction } from '@/app/actions/members'
import type { PermissionType } from '@/types/database'

const PERMISSION_OPTIONS: { value: PermissionType; label: string }[] = [
  { value: 'read', label: 'Read' },
  { value: 'edit', label: 'Edit' },
  { value: 'create', label: 'Create' },
  { value: 'delete', label: 'Delete' },
  { value: 'manage_folders', label: 'Manage folders' },
  { value: 'manage_documents', label: 'Manage documents' },
  { value: 'manage_tasks', label: 'Manage tasks' },
  { value: 'manage_members', label: 'Manage members' },
]

type Member = {
  id: string
  userId: string
  role: 'admin' | 'member'
  email: string
  displayName: string | null
  permissions: string[]
}

export default function MembersList({
  members,
  companyId,
  slug,
  currentUserId,
  canManage,
}: {
  members: Member[]
  companyId: string
  slug: string
  currentUserId: string
  canManage: boolean
}) {
  const router = useRouter()
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>([])

  async function handleRoleChange(userId: string, role: 'admin' | 'member') {
    const result = await updateMemberRoleAction(companyId, userId, role)
    if (result.error) alert(result.error)
    else router.refresh()
  }

  async function handleRemove(userId: string) {
    if (!confirm('Remove this member from the company?')) return
    const result = await removeMemberAction(companyId, userId)
    if (result.error) alert(result.error)
    else router.refresh()
  }

  function startEditPermissions(m: Member) {
    setEditingPermissions(m.userId)
    setSelectedPermissions(m.permissions as PermissionType[])
  }

  async function savePermissions(userId: string) {
    const result = await setMemberPermissionsAction(companyId, userId, selectedPermissions)
    if (result.error) alert(result.error)
    else {
      setEditingPermissions(null)
      router.refresh()
    }
  }

  function togglePermission(p: PermissionType) {
    setSelectedPermissions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
      {members.map((m) => (
        <li key={m.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              {m.displayName || m.email}
              {m.userId === currentUserId && (
                <span className="ml-2 text-xs text-zinc-500">(you)</span>
              )}
            </p>
            {m.displayName && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{m.email}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {canManage && m.userId !== currentUserId && (
              <>
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.userId, e.target.value as 'admin' | 'member')}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                {m.role === 'member' && (
                  <>
                    {editingPermissions === m.userId ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {PERMISSION_OPTIONS.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(opt.value)}
                              onChange={() => togglePermission(opt.value)}
                              className="rounded border-zinc-300"
                            />
                            {opt.label}
                          </label>
                        ))}
                        <button
                          type="button"
                          onClick={() => savePermissions(m.userId)}
                          className="rounded bg-zinc-900 px-2 py-1 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPermissions(null)}
                          className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditPermissions(m)}
                        className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
                      >
                        Permissions {m.permissions.length ? `(${m.permissions.length})` : ''}
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(m.userId)}
                  className="text-sm text-red-600 hover:underline dark:text-red-400"
                >
                  Remove
                </button>
              </>
            )}
            {m.role === 'admin' && (
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                Admin
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
