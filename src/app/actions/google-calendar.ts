'use server'

import { createClient } from '@/lib/supabase/server'
import { canEditTasks } from '@/lib/permissions'

const APP_SCHEMA = 'app'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

/** Get Google Calendar sync status for a company */
export async function getGoogleCalendarSyncAction(companyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', sync: null }
  
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  
  const { data: sync, error } = await supabase
    .schema(APP_SCHEMA)
    .from('google_calendar_sync')
    .select('id, sync_enabled, calendar_id, token_expires_at')
    .eq('company_id', companyId)
    .eq('user_id', profile?.id ?? user.id)
    .single()
  
  if (error && error.code !== 'PGRST116') return { error: error.message, sync: null }
  return { error: null, sync }
}

/** Save Google Calendar OAuth tokens */
export async function saveGoogleCalendarTokensAction(
  companyId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  calendarId?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
  
  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('google_calendar_sync')
    .upsert({
      company_id: companyId,
      user_id: profile?.id ?? user.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: expiresAt,
      calendar_id: calendarId || null,
      sync_enabled: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'company_id,user_id',
    })
  
  return error ? { error: error.message } : { error: null }
}

/** Disable Google Calendar sync */
export async function disableGoogleCalendarSyncAction(companyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  
  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('google_calendar_sync')
    .update({ sync_enabled: false })
    .eq('company_id', companyId)
    .eq('user_id', profile?.id ?? user.id)
  
  return error ? { error: error.message } : { error: null }
}

/** Sync a task to Google Calendar */
export async function syncTaskToGoogleCalendarAction(companyId: string, taskId: string) {
  if (!(await canEditTasks(companyId))) return { error: 'No permission.' }
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  
  // Get task
  const { data: task, error: taskError } = await supabase
    .schema(APP_SCHEMA)
    .from('tasks')
    .select('id, title, description, due_date, status')
    .eq('id', taskId)
    .eq('company_id', companyId)
    .single()
  
  if (taskError || !task) return { error: 'Task not found.' }
  if (!task.due_date) return { error: 'Task must have a due date to sync.' }
  
  // Get sync settings
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const { data: sync, error: syncError } = await supabase
    .schema(APP_SCHEMA)
    .from('google_calendar_sync')
    .select('id, access_token, refresh_token, token_expires_at, calendar_id')
    .eq('company_id', companyId)
    .eq('user_id', profile?.id ?? user.id)
    .eq('sync_enabled', true)
    .single()
  
  if (syncError || !sync) return { error: 'Google Calendar sync not configured.' }
  
  // Check if token needs refresh
  const tokenExpired = new Date(sync.token_expires_at) < new Date()
  let accessToken = sync.access_token
  
  if (tokenExpired) {
    // Refresh token (simplified - in production, implement proper OAuth refresh)
    return { error: 'Token expired. Please reconnect Google Calendar.' }
  }
  
  // Check if event already exists
  const { data: existingEvent } = await supabase
    .schema(APP_SCHEMA)
    .from('task_calendar_events')
    .select('google_event_id')
    .eq('task_id', taskId)
    .eq('sync_id', sync.id)
    .single()
  
  const calendarId = sync.calendar_id || 'primary'
  const dueDate = new Date(task.due_date + 'T09:00:00') // Default to 9 AM
  const endDate = new Date(dueDate.getTime() + 60 * 60 * 1000) // 1 hour duration
  
  const event = {
    summary: task.title,
    description: task.description || '',
    start: {
      dateTime: dueDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  }
  
  try {
    let googleEventId: string
    
    if (existingEvent?.google_event_id) {
      // Update existing event
      const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events/${existingEvent.google_event_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })
      
      if (!response.ok) {
        const error = await response.json()
        return { error: error.error?.message || 'Failed to update Google Calendar event.' }
      }
      
      googleEventId = existingEvent.google_event_id
    } else {
      // Create new event
      const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })
      
      if (!response.ok) {
        const error = await response.json()
        return { error: error.error?.message || 'Failed to create Google Calendar event.' }
      }
      
      const data = await response.json()
      googleEventId = data.id
      
      // Save mapping
      await supabase
        .schema(APP_SCHEMA)
        .from('task_calendar_events')
        .insert({
          task_id: taskId,
          sync_id: sync.id,
          google_event_id: googleEventId,
        })
    }
    
    return { error: null, eventId: googleEventId }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to sync to Google Calendar.' }
  }
}
