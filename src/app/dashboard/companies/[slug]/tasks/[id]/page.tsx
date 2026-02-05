import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { canReadTasks, canEditTasks, canDeleteTasks } from '@/lib/permissions'
import TaskDetail from './TaskDetail'
import TaskComments from './TaskComments'

const APP_SCHEMA = 'app'

export default async function TaskPage({
  params,
}: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: company } = await supabase.schema(APP_SCHEMA).from('companies').select('id, name, slug').eq('slug', slug).single()
  if (!company) notFound()

  const canRead = await canReadTasks(company.id)
  if (!canRead) notFound()

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

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href={`/dashboard/companies/${slug}/tasks`} className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">← Tasks</Link>
      </div>
      <TaskDetail
        companyId={company.id}
        taskId={task.id}
        slug={slug}
        initial={{ title: task.title, description: task.description ?? '', status: task.status, due_date: task.due_date ?? '', assigned_to: task.assigned_to ?? '' }}
        members={membersList}
        canEdit={canEdit}
        canDelete={canDelete}
      />
      <TaskComments
        companyId={company.id}
        taskId={task.id}
        slug={slug}
        comments={commentTree}
        canEdit={canEdit}
      />
    </div>
  )
}
