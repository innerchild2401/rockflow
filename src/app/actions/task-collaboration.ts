'use server'

import { createClient } from '@/lib/supabase/server'
import { canEditTasks, canReadDocuments } from '@/lib/permissions'

const APP_SCHEMA = 'app'

/** Attach a document to a task. */
export async function attachDocumentToTaskAction(
  companyId: string,
  taskId: string,
  documentId: string
) {
  if (!(await canEditTasks(companyId))) return { error: 'No permission.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  
  // Verify document exists and user can read it
  const { data: doc } = await supabase
    .schema(APP_SCHEMA)
    .from('documents')
    .select('id, company_id')
    .eq('id', documentId)
    .single()
  if (!doc || doc.company_id !== companyId) return { error: 'Document not found.' }
  if (!(await canReadDocuments(companyId))) return { error: 'No permission to read documents.' }
  
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('task_attachments')
    .insert({
      task_id: taskId,
      document_id: documentId,
      attached_by: profile?.id ?? user.id,
    })
  if (error) {
    if (error.code === '23505') return { error: 'Document already attached to this task.' }
    return { error: error.message }
  }
  
  // Create notification for task watchers
  await createNotificationForWatchers(companyId, taskId, 'document_added', user.id, null, documentId)
  
  return { error: null }
}

/** Remove a document attachment from a task. */
export async function detachDocumentFromTaskAction(
  companyId: string,
  taskId: string,
  documentId: string
) {
  if (!(await canEditTasks(companyId))) return { error: 'No permission.' }
  const { error } = await (await createClient())
    .schema(APP_SCHEMA)
    .from('task_attachments')
    .delete()
    .eq('task_id', taskId)
    .eq('document_id', documentId)
  return error ? { error: error.message } : { error: null }
}

/** Parse @mentions from comment text and create mention records + notifications. */
export async function processMentionsAction(
  companyId: string,
  taskId: string,
  commentId: string,
  body: string,
  mentionedBy: string
) {
  if (!(await canEditTasks(companyId))) return { error: 'No permission.' }
  const supabase = await createClient()
  
  // Extract @mentions (simple regex: @username or @email)
  const mentionRegex = /@([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9._-]+)/g
  const matches = [...body.matchAll(mentionRegex)]
  if (matches.length === 0) return { error: null, mentioned: [] }
  
  // Get all company members to match mentions
  const { data: members } = await supabase
    .schema(APP_SCHEMA)
    .from('company_members')
    .select('user_id')
    .eq('company_id', companyId)
  const memberIds = [...new Set((members ?? []).map((m) => m.user_id))]
  
  const { data: profiles } = memberIds.length
    ? await supabase.schema(APP_SCHEMA).from('profiles').select('id, email, display_name').in('id', memberIds)
    : { data: [] }
  
  const mentioned: string[] = []
  for (const match of matches) {
    const mentionText = match[1].toLowerCase()
    const profile = profiles?.find(
      (p) =>
        p.email.toLowerCase() === mentionText ||
        p.display_name?.toLowerCase().replace(/\s+/g, '_') === mentionText ||
        p.display_name?.toLowerCase().replace(/\s+/g, '-') === mentionText
    )
    if (profile && !mentioned.includes(profile.id)) {
      mentioned.push(profile.id)
      await supabase.schema(APP_SCHEMA).from('task_mentions').insert({
        task_id: taskId,
        comment_id: commentId,
        mentioned_user_id: profile.id,
        mentioned_by: mentionedBy,
      })
      await createNotificationForWatchers(companyId, taskId, 'mentioned', mentionedBy, commentId, null, profile.id)
    }
  }
  
  return { error: null, mentioned }
}

/** Create notifications for all task watchers. */
export async function createNotificationForWatchers(
  companyId: string,
  taskId: string,
  type: 'mentioned' | 'assigned' | 'commented' | 'status_changed' | 'document_added' | 'due_date_changed',
  actorId: string,
  commentId: string | null = null,
  documentId: string | null = null,
  targetUserId: string | null = null
): Promise<void> {
  const supabase = await createClient()
  const { data: watchers } = await supabase
    .schema(APP_SCHEMA)
    .from('task_watchers')
    .select('user_id')
    .eq('task_id', taskId)
  
  if (!watchers?.length) return
  
  // For mentions, only notify the mentioned user
  // For other types, notify all watchers except the actor
  const notifyUserIds = type === 'mentioned' && targetUserId
    ? [targetUserId]
    : watchers.filter((w) => w.user_id !== actorId).map((w) => w.user_id)
  
  if (notifyUserIds.length === 0) return
  
  const notifications = notifyUserIds.map((userId) => ({
    user_id: userId,
    task_id: taskId,
    type,
    comment_id: commentId,
    document_id: documentId,
    actor_id: actorId,
  }))
  
  await supabase.schema(APP_SCHEMA).from('task_notifications').insert(notifications)
}

/** Get unread task notification count. Returns 0 if table missing or no tasks. */
export async function getUnreadNotificationCountAction(companyId: string): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  
  const { data: tasks } = await supabase
    .schema(APP_SCHEMA)
    .from('tasks')
    .select('id')
    .eq('company_id', companyId)
  const taskIds = tasks?.map((t) => t.id) ?? []
  if (taskIds.length === 0) return 0
  
  const { count: unreadCount, error } = await supabase
    .schema(APP_SCHEMA)
    .from('task_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null)
    .in('task_id', taskIds)
  
  if (error) return 0
  return unreadCount ?? 0
}

/** Mark notifications as read. */
export async function markNotificationsReadAction(notificationIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  
  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('task_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .in('id', notificationIds)
  
  return error ? { error: error.message } : { error: null }
}

/** Get notifications for current user. Returns [] if table missing or no tasks. */
export async function getNotificationsAction(companyId: string, limit = 50) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', notifications: [] }
  
  const { data: tasks } = await supabase
    .schema(APP_SCHEMA)
    .from('tasks')
    .select('id')
    .eq('company_id', companyId)
  const taskIds = tasks?.map((t) => t.id) ?? []
  if (taskIds.length === 0) return { error: null, notifications: [] }
  
  const { data: notifications, error } = await supabase
    .schema(APP_SCHEMA)
    .from('task_notifications')
    .select('id, task_id, type, comment_id, document_id, actor_id, read_at, created_at')
    .eq('user_id', user.id)
    .in('task_id', taskIds)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) return { error: null, notifications: [] }
  return { error: null, notifications: notifications ?? [] }
}

/** Watch a task (add user to watchers). */
export async function watchTaskAction(companyId: string, taskId: string) {
  if (!(await canEditTasks(companyId))) return { error: 'No permission.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('task_watchers')
    .insert({
      task_id: taskId,
      user_id: profile?.id ?? user.id,
    })
  
  if (error) {
    if (error.code === '23505') return { error: null } // Already watching
    return { error: error.message }
  }
  return { error: null }
}

/** Unwatch a task (remove user from watchers). */
export async function unwatchTaskAction(companyId: string, taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('task_watchers')
    .delete()
    .eq('task_id', taskId)
    .eq('user_id', profile?.id ?? user.id)
  
  return error ? { error: error.message } : { error: null }
}

/** Get watchers for a task. */
export async function getTaskWatchersAction(companyId: string, taskId: string) {
  const supabase = await createClient()
  
  const { data: watchers } = await supabase
    .schema(APP_SCHEMA)
    .from('task_watchers')
    .select('user_id')
    .eq('task_id', taskId)
  
  const userIds = watchers?.map((w) => w.user_id) ?? []
  if (userIds.length === 0) return { error: null, watchers: [] }
  
  const { data: profiles } = await supabase
    .schema(APP_SCHEMA)
    .from('profiles')
    .select('id, display_name, email')
    .in('id', userIds)
  
  return { error: null, watchers: profiles ?? [] }
}

/** Check if current user is watching a task. */
export async function isWatchingTaskAction(companyId: string, taskId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const { data } = await supabase
    .schema(APP_SCHEMA)
    .from('task_watchers')
    .select('user_id')
    .eq('task_id', taskId)
    .eq('user_id', profile?.id ?? user.id)
    .single()
  
  return !!data
}
