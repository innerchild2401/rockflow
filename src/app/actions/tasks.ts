'use server'

import { createClient } from '@/lib/supabase/server'
import {
  canCreateTasks,
  canEditTasks,
  canDeleteTasks,
} from '@/lib/permissions'
import type { TaskStatus } from '@/types/database'
import { processMentionsAction, createNotificationForWatchers } from './task-collaboration'

const APP_SCHEMA = 'app'

export async function createTaskAction(
  companyId: string,
  payload: { title: string; description?: string; status?: TaskStatus; due_date?: string | null; assigned_to?: string | null }
) {
  if (!(await canCreateTasks(companyId)))
    return { error: 'No permission to create tasks.', id: null }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', id: null }
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const { data, error } = await supabase
    .schema(APP_SCHEMA)
    .from('tasks')
    .insert({
      company_id: companyId,
      title: payload.title.trim(),
      description: payload.description?.trim() ?? '',
      status: payload.status ?? 'todo',
      due_date: payload.due_date || null,
      assigned_to: payload.assigned_to || null,
      created_by: profile?.id ?? user.id,
    })
    .select('id')
    .single()
  if (error) return { error: error.message, id: null }
  return { error: null, id: data.id }
}

export async function updateTaskAction(
  companyId: string,
  taskId: string,
  payload: { title?: string; description?: string; status?: TaskStatus; due_date?: string | null; assigned_to?: string | null }
) {
  if (!(await canEditTasks(companyId))) return { error: 'No permission.' }
  const updates: Record<string, unknown> = {}
  if (payload.title !== undefined) updates.title = payload.title.trim()
  if (payload.description !== undefined) updates.description = payload.description?.trim() ?? ''
  if (payload.status !== undefined) updates.status = payload.status
  if (payload.due_date !== undefined) updates.due_date = payload.due_date || null
  if (payload.assigned_to !== undefined) updates.assigned_to = payload.assigned_to || null
  if (Object.keys(updates).length === 0) return { error: null }
  const { error } = await (await createClient())
    .schema(APP_SCHEMA)
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .eq('company_id', companyId)
  return error ? { error: error.message } : { error: null }
}

export async function deleteTaskAction(companyId: string, taskId: string) {
  if (!(await canDeleteTasks(companyId))) return { error: 'No permission.' }
  const { error } = await (await createClient())
    .schema(APP_SCHEMA)
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('company_id', companyId)
  return error ? { error: error.message } : { error: null }
}

export async function createTaskCommentAction(
  companyId: string,
  taskId: string,
  body: string,
  parentCommentId: string | null
) {
  if (!(await canEditTasks(companyId))) return { error: 'No permission.', id: null }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', id: null }
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const { data, error } = await supabase
    .schema(APP_SCHEMA)
    .from('task_comments')
    .insert({
      task_id: taskId,
      parent_comment_id: parentCommentId,
      user_id: profile?.id ?? user.id,
      body: body.trim(),
    })
    .select('id')
    .single()
  if (error) return { error: error.message, id: null }
  
  // Process @mentions and create notifications
  await processMentionsAction(companyId, taskId, data.id, body, profile?.id ?? user.id)
  await createNotificationForWatchers(companyId, taskId, 'commented', profile?.id ?? user.id, data.id)
  
  return { error: null, id: data.id }
}

export async function updateTaskCommentAction(
  companyId: string,
  commentId: string,
  body: string
) {
  if (!(await canEditTasks(companyId))) return { error: 'No permission.' }
  const { error } = await (await createClient())
    .schema(APP_SCHEMA)
    .from('task_comments')
    .update({ body: body.trim(), updated_at: new Date().toISOString() })
    .eq('id', commentId)
  if (error) return { error: error.message }
  return { error: null }
}

export async function deleteTaskCommentAction(companyId: string, commentId: string) {
  if (!(await canEditTasks(companyId))) return { error: 'No permission.' }
  const { error } = await (await createClient())
    .schema(APP_SCHEMA)
    .from('task_comments')
    .delete()
    .eq('id', commentId)
  return error ? { error: error.message } : { error: null }
}
