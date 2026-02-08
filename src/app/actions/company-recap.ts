'use server'

import { createClient } from '@/lib/supabase/server'
import { chat } from '@/lib/openai'

const APP_SCHEMA = 'app'

/** Start of current hour (UTC) for cache key. */
function getPeriodStart(): string {
  const d = new Date()
  d.setUTCMinutes(0, 0, 0)
  return d.toISOString()
}

/** Fetch audit events for company in the past hour (since period_start). Returns [] if table missing or error. */
async function getAuditEvents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  periodStart: string
): Promise<string[]> {
  try {
    const { data: logs, error } = await supabase
      .schema(APP_SCHEMA)
      .from('audit_logs')
      .select('id, user_id, action, entity_type, entity_id, old_value, new_value, created_at')
      .eq('company_id', companyId)
      .gte('created_at', periodStart)
      .order('created_at', { ascending: true })
    if (error || !logs?.length) return []
    const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean) as string[])]
    const { data: profiles } = userIds.length
      ? await supabase.schema(APP_SCHEMA).from('profiles').select('id, display_name, email').in('id', userIds)
      : { data: [] }
    const nameBy: Record<string, string> = {}
    for (const p of profiles ?? []) {
      nameBy[p.id] = p.display_name || p.email
    }
    const events: string[] = []
    for (const row of logs) {
      const who = row.user_id ? (nameBy[row.user_id] ?? 'Someone') : 'Someone'
      const ov = row.old_value as { title?: string; status?: string } | null
      const nv = row.new_value as { title?: string; status?: string; uploaded?: boolean; file_name?: string } | null
      const title = nv?.title ?? ov?.title
      if (row.entity_type === 'task') {
        if (row.action === 'created') events.push(`${who} created task "${title ?? 'Untitled'}"`)
        else if (row.action === 'updated' && nv?.status === 'done') events.push(`${who} completed task "${title ?? 'Untitled'}"`)
        else if (row.action === 'deleted') events.push(`${who} deleted task "${ov?.title ?? 'Untitled'}"`)
        else if (row.action === 'updated') events.push(`${who} updated task "${title ?? 'Untitled'}"`)
      } else if (row.entity_type === 'document') {
        if (row.action === 'created' && nv?.uploaded) events.push(`${who} uploaded document "${nv?.file_name ?? title ?? 'Untitled'}"`)
        else if (row.action === 'created') events.push(`${who} created document "${title ?? 'Untitled'}"`)
        else if (row.action === 'deleted') events.push(`${who} deleted document "${ov?.title ?? 'Untitled'}"`)
      }
    }
    return events
  } catch {
    return []
  }
}

/** Fetch mentions of current user in task comments in the past hour. */
async function getMentionsForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  userId: string,
  periodStart: string
): Promise<string[]> {
  try {
    const { data: mentions } = await supabase
      .schema(APP_SCHEMA)
      .from('task_mentions')
      .select('comment_id, mentioned_by')
      .eq('mentioned_user_id', userId)

    if (!mentions?.length) return []
    const commentIds = mentions.map((m) => m.comment_id)
    const { data: comments } = await supabase
      .schema(APP_SCHEMA)
      .from('task_comments')
      .select('id, body, created_at, task_id')
      .in('id', commentIds)
      .gte('created_at', periodStart)

    if (!comments?.length) return []
    const taskIds = [...new Set(comments.map((c) => c.task_id))]
    const { data: tasks } = await supabase
      .schema(APP_SCHEMA)
      .from('tasks')
      .select('id, title')
      .in('id', taskIds)
      .eq('company_id', companyId)
    const taskTitleBy: Record<string, string> = {}
    for (const t of tasks ?? []) taskTitleBy[t.id] = t.title ?? 'Untitled'
    const { data: authorProfiles } = await supabase
      .schema(APP_SCHEMA)
      .from('profiles')
      .select('id, display_name, email')
      .in('id', [...new Set(mentions.map((m) => m.mentioned_by))])
    const authorBy: Record<string, string> = {}
    for (const p of authorProfiles ?? []) authorBy[p.id] = p.display_name || p.email
    const events: string[] = []
    for (const c of comments) {
      const author = authorBy[mentions.find((m) => m.comment_id === c.id)?.mentioned_by ?? ''] ?? 'Someone'
      const taskTitle = taskTitleBy[c.task_id] ?? 'a task'
      const snippet = c.body.slice(0, 80) + (c.body.length > 80 ? '…' : '')
      events.push(`${author} mentioned you in task "${taskTitle}": "${snippet}"`)
    }
    return events
  } catch {
    return []
  }
}

export type RecapResult = { error: string | null; content: string | null; periodStart: string | null }

/** Get or generate the hourly recap for the company. Cached per company per hour. */
export async function getCompanyRecapAction(companyId: string): Promise<RecapResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', content: null, periodStart: null }

  const { data: member } = await supabase
    .schema(APP_SCHEMA)
    .from('company_members')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .single()
  if (!member) return { error: 'Not a member of this company.', content: null, periodStart: null }

  const periodStart = getPeriodStart()

  const { data: cached } = await supabase
    .schema(APP_SCHEMA)
    .from('company_recaps')
    .select('content')
    .eq('company_id', companyId)
    .eq('period_start', periodStart)
    .single()

  if (cached?.content) return { error: null, content: cached.content, periodStart }

  const auditEvents = await getAuditEvents(supabase, companyId, periodStart)
  const profile = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const currentUserId = profile?.data?.id ?? user.id
  const mentionEvents = await getMentionsForUser(supabase, companyId, currentUserId, periodStart)
  const allEvents = [...auditEvents, ...mentionEvents]
  if (allEvents.length === 0) {
    const fallback = 'No recorded activity in the past hour.'
    await supabase.schema(APP_SCHEMA).from('company_recaps').upsert(
      { company_id: companyId, period_start: periodStart, content: fallback },
      { onConflict: 'company_id,period_start' }
    )
    return { error: null, content: fallback, periodStart }
  }

  const eventsBlob = allEvents.map((e) => `- ${e}`).join('\n')
  const systemPrompt = `You are writing a brief, professional "past hour" recap for an organisation. Use only the events provided. Write 1–2 short paragraphs in a neutral, report style. No bullet lists in the output; use flowing prose. Do not invent any events.`
  const userPrompt = `Events in the past hour:\n${eventsBlob}\n\nWrite a short recap of what happened in the organisation in the past hour.`

  let content: string
  try {
    content = await chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to generate recap.'
    const friendly =
      msg.includes('OPENAI_API_KEY') || msg.includes('API key')
        ? 'Recap requires OPENAI_API_KEY to be set in environment.'
        : msg
    return { error: friendly, content: null, periodStart: null }
  }

  if (!content.trim()) content = 'No summary could be generated for the past hour.'

  const { error: upsertError } = await supabase.schema(APP_SCHEMA).from('company_recaps').upsert(
    { company_id: companyId, period_start: periodStart, content: content.trim() },
    { onConflict: 'company_id,period_start' }
  )
  // If upsert fails (e.g. table missing), still return the generated content
  if (upsertError && process.env.NODE_ENV === 'development') {
    console.warn('[company-recap] cache upsert failed:', upsertError.message)
  }

  return { error: null, content: content.trim(), periodStart }
}
