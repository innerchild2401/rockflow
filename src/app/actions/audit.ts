'use server'

import { createClient } from '@/lib/supabase/server'
import type { AuditAction, AuditEntityType } from '@/types/database'

const APP_SCHEMA = 'app'

export type AuditPayload = {
  company_id: string
  user_id: string | null
  action: AuditAction
  entity_type: AuditEntityType
  entity_id: string | null
  old_value?: Record<string, unknown> | null
  new_value?: Record<string, unknown> | null
}

/** Insert one row into app.audit_logs. Fire-and-forget; does not throw. */
export async function insertAuditLog(payload: AuditPayload): Promise<void> {
  const supabase = await createClient()
  await supabase.schema(APP_SCHEMA).from('audit_logs').insert({
    company_id: payload.company_id,
    user_id: payload.user_id,
    action: payload.action,
    entity_type: payload.entity_type,
    entity_id: payload.entity_id,
    old_value: payload.old_value ?? null,
    new_value: payload.new_value ?? null,
  })
}
