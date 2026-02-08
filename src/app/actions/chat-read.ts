'use server'

import { createClient } from '@/lib/supabase/server'

const APP_SCHEMA = 'app'

/** Get when the current user last read this task's chat. */
export async function getTaskChatReadAtAction(
  companyId: string,
  taskId: string
): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .schema(APP_SCHEMA)
    .from('task_chat_read')
    .select('read_at')
    .eq('user_id', user.id)
    .eq('task_id', taskId)
    .single()

  return data?.read_at ?? null
}

/** Mark this task's chat as read for the current user (upsert read_at = now()). */
export async function setTaskChatReadAction(
  companyId: string,
  taskId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('task_chat_read')
    .upsert(
      { user_id: user.id, task_id: taskId, read_at: new Date().toISOString() },
      { onConflict: 'user_id,task_id' }
    )

  return error ? { error: error.message } : { error: null }
}

/** Get new (unread) message counts per task for the current user. */
export async function getTaskNewMessageCountsAction(
  companyId: string,
  taskIds: string[]
): Promise<Record<string, number>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || taskIds.length === 0) return {}

  const { data: readRows } = await supabase
    .schema(APP_SCHEMA)
    .from('task_chat_read')
    .select('task_id, read_at')
    .eq('user_id', user.id)
    .in('task_id', taskIds)

  const readAtByTask: Record<string, string> = {}
  for (const r of readRows ?? []) {
    readAtByTask[r.task_id] = r.read_at
  }

  const counts: Record<string, number> = {}
  for (const tid of taskIds) {
    counts[tid] = 0
  }

  const { data: comments } = await supabase
    .schema(APP_SCHEMA)
    .from('task_comments')
    .select('task_id, created_at')
    .in('task_id', taskIds)

  const cutoff = (tid: string) => {
    const r = readAtByTask[tid]
    return r ? new Date(r).getTime() : 0
  }

  for (const c of comments ?? []) {
    const t = new Date(c.created_at).getTime()
    if (t > cutoff(c.task_id)) {
      counts[c.task_id] = (counts[c.task_id] ?? 0) + 1
    }
  }

  return counts
}

/** Get when the current user last read this company's feed. */
export async function getCompanyFeedReadAtAction(companyId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .schema(APP_SCHEMA)
    .from('company_feed_read')
    .select('read_at')
    .eq('user_id', user.id)
    .eq('company_id', companyId)
    .single()

  return data?.read_at ?? null
}

/** Mark this company's feed as read for the current user. */
export async function setCompanyFeedReadAction(companyId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('company_feed_read')
    .upsert(
      { user_id: user.id, company_id: companyId, read_at: new Date().toISOString() },
      { onConflict: 'user_id,company_id' }
    )

  return error ? { error: error.message } : { error: null }
}
