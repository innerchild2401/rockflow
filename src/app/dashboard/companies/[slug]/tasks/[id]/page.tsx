import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { canReadTasks, canEditTasks, canDeleteTasks } from '@/lib/permissions'
import { NoPermission } from '@/components/ui/NoPermission'
import { PageHeader } from '@/components/ui/PageHeader'
import { getTaskChatReadAtAction } from '@/app/actions/chat-read'
import TaskDetail from './TaskDetail'
import TaskChat from './TaskChat'
import AttachmentsPanel from './AttachmentsPanel'
import TaskPageLayout from './TaskPageLayout'

const APP_SCHEMA = 'app'

export default async function TaskPage({
  params,
}: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const currentUserId = profile?.id ?? user.id
  
  const { data: company } = await supabase.schema(APP_SCHEMA).from('companies').select('id, name, slug').eq('slug', slug).single()
  if (!company) notFound()

  const canRead = await canReadTasks(company.id)
  if (!canRead) {
    return (
      <NoPermission
        title="You don't have permission to view this task"
        backHref={`/dashboard/companies/${slug}/tasks`}
        backLabel="Tasks"
      />
    )
  }

  const { data: task } = await supabase
    .schema(APP_SCHEMA)
    .from('tasks')
    .select('id, title, description, status, due_date, assigned_to, created_by, created_at, updated_at')
    .eq('id', id)
    .eq('company_id', company.id)
    .single()

  if (!task) notFound()

  const { data: comments } = await supabase
    .schema(APP_SCHEMA)
    .from('task_comments')
    .select('id, task_id, parent_comment_id, user_id, body, created_at, updated_at')
    .eq('task_id', id)
    .order('created_at', { ascending: true })

  const userIds = [...new Set((comments ?? []).map((c) => c.user_id))]
  const { data: profiles } = userIds.length
    ? await supabase.schema(APP_SCHEMA).from('profiles').select('id, display_name, email').in('id', userIds)
    : { data: [] }

  const profileMap: Record<string, { display_name: string | null; email: string }> = {}
  for (const p of profiles ?? []) {
    profileMap[p.id] = { display_name: p.display_name, email: p.email }
  }

  type CommentRow = { id: string; parent_comment_id: string | null; user_id: string; body: string; created_at: string; updated_at: string }
  type CommentWithAuthor = CommentRow & { author: string; replies?: CommentWithAuthor[] }
  const commentsList = (comments ?? []) as CommentRow[]
  const byParent = commentsList.reduce((acc: Record<string, CommentRow[]>, c) => {
    const key = c.parent_comment_id ?? '_root'
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})
  function toTree(parentId: string | null): CommentWithAuthor[] {
    const list = byParent[parentId ?? '_root'] ?? []
    return list.map((c) => ({
      ...c,
      author: profileMap[c.user_id]?.display_name || profileMap[c.user_id]?.email || 'Unknown',
      replies: toTree(c.id),
    }))
  }
  const commentTree = toTree(null)

  const canEdit = await canEditTasks(company.id)
  const canDelete = await canDeleteTasks(company.id)

  const { data: members } = await supabase
    .schema(APP_SCHEMA)
    .from('company_members')
    .select('user_id')
    .eq('company_id', company.id)
  const memberIds = [...new Set((members ?? []).map((m) => m.user_id))]
  const { data: memberProfiles } = memberIds.length
    ? await supabase.schema(APP_SCHEMA).from('profiles').select('id, display_name, email').in('id', memberIds)
    : { data: [] }
  const membersList = (memberProfiles ?? []) as { id: string; display_name: string | null; email: string }[]

  const readAt = await getTaskChatReadAtAction(company.id, task.id)

  // Get task attachments with metadata
  const { data: attachments } = await supabase
    .schema(APP_SCHEMA)
    .from('task_attachments')
    .select('document_id, attached_by, created_at')
    .eq('task_id', id)
    .order('created_at', { ascending: true })
  
  const documentIds = attachments?.map((a) => a.document_id) ?? []
  const { data: attachedDocuments } = documentIds.length
    ? await supabase.schema(APP_SCHEMA).from('documents').select('id, title, file_name').in('id', documentIds)
    : { data: [] }
  
  // Map attachments with metadata
  const attachmentsWithMeta = (attachedDocuments ?? []).map((doc) => {
    const attachment = attachments?.find((a) => a.document_id === doc.id)
    const attachedByProfile = attachment?.attached_by
      ? membersList.find((m) => m.id === attachment.attached_by)
      : null
    const attachedBy = attachedByProfile?.display_name || attachedByProfile?.email || 'Unknown'
    return {
      ...doc,
      attached_by: attachedBy,
      attached_at: attachment?.created_at || null,
    }
  })

  // Get assignee name
  const assigneeName = task.assigned_to
    ? membersList.find((m) => m.id === task.assigned_to)?.display_name || membersList.find((m) => m.id === task.assigned_to)?.email || null
    : null

  // Get all documents for attachment menu
  const { data: allDocuments } = await supabase
    .schema(APP_SCHEMA)
    .from('documents')
    .select('id, title, file_name')
    .eq('company_id', company.id)
    .order('updated_at', { ascending: false })
    .limit(100)

  const taskChatProps = {
    companyId: company.id,
    taskId: task.id,
    slug,
    taskTitle: task.title,
    taskStatus: task.status,
    taskDueDate: task.due_date,
    taskAssignedTo: task.assigned_to,
    taskAssigneeName: assigneeName,
    comments: commentTree,
    attachments: attachmentsWithMeta as { id: string; title: string; file_name: string | null; attached_by?: string; attached_at?: string | null }[],
    availableDocuments: (allDocuments ?? []) as { id: string; title: string; file_name: string | null }[],
    currentUserId: currentUserId,
    members: membersList,
    canEdit: canEdit,
    readAt,
  }

  return (
    <div className="mx-auto flex min-h-0 max-w-7xl flex-1 flex-col px-0 sm:px-6 lg:min-h-0">
      {/* Desktop: full page header. Mobile: back + title live inside TaskPageLayout to save space */}
      <div className="mb-8 hidden flex-col gap-4 sm:flex-row sm:items-start sm:justify-between lg:mb-0 lg:flex">
        <PageHeader backHref={`/dashboard/companies/${slug}/tasks`} backLabel="Tasks" title="Task" />
      </div>
      <div className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden gap-4 lg:mt-6 lg:min-h-0">
        <TaskPageLayout
          backHref={`/dashboard/companies/${slug}/tasks`}
          backLabel="Tasks"
          detailsSlot={
            <TaskDetail
              companyId={company.id}
              taskId={task.id}
              slug={slug}
              initial={{ title: task.title, description: task.description ?? '', status: task.status, due_date: task.due_date ?? '', assigned_to: task.assigned_to ?? '' }}
              members={membersList}
              canEdit={canEdit}
              canDelete={canDelete}
              availableDocuments={allDocuments ?? []}
            />
          }
          attachmentsSlot={
            <AttachmentsPanel
              companyId={company.id}
              taskId={task.id}
              slug={slug}
              attachments={attachmentsWithMeta as { id: string; title: string; file_name: string | null; attached_by?: string; attached_at?: string | null }[]}
              canEdit={canEdit}
              availableDocuments={(allDocuments ?? []) as { id: string; title: string; file_name: string | null }[]}
            />
          }
          chatTabSlot={<TaskChat {...taskChatProps} variant="chatOnly" />}
          chatFullSlot={<TaskChat {...taskChatProps} />}
        />
      </div>
    </div>
  )
}
