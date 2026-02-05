'use server'

import { createClient } from '@/lib/supabase/server'
import {
  canCreateDocuments,
  canEditDocuments,
  canDeleteDocuments,
  canManageFolders,
} from '@/lib/permissions'

const APP_SCHEMA = 'app'

export async function createFolderAction(
  companyId: string,
  name: string,
  parentFolderId: string | null
) {
  if (!(await canManageFolders(companyId)))
    return { error: 'No permission to manage folders.', id: null }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', id: null }
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const { data, error } = await supabase
    .schema(APP_SCHEMA)
    .from('folders')
    .insert({ company_id: companyId, parent_folder_id: parentFolderId, name: name.trim(), created_by: profile?.id ?? user.id })
    .select('id')
    .single()
  if (error) return { error: error.message, id: null }
  return { error: null, id: data.id }
}

export async function updateFolderAction(companyId: string, folderId: string, name: string) {
  if (!(await canManageFolders(companyId))) return { error: 'No permission.' }
  const { error } = await (await createClient()).schema(APP_SCHEMA).from('folders').update({ name: name.trim() }).eq('id', folderId).eq('company_id', companyId)
  return error ? { error: error.message } : { error: null }
}

export async function deleteFolderAction(companyId: string, folderId: string) {
  if (!(await canManageFolders(companyId))) return { error: 'No permission.' }
  const { error } = await (await createClient()).schema(APP_SCHEMA).from('folders').delete().eq('id', folderId).eq('company_id', companyId)
  return error ? { error: error.message } : { error: null }
}

export async function createDocumentAction(
  companyId: string,
  title: string,
  folderId: string | null,
  content: string
) {
  if (!(await canCreateDocuments(companyId)))
    return { error: 'No permission to create documents.', id: null }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', id: null }
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const { data, error } = await supabase
    .schema(APP_SCHEMA)
    .from('documents')
    .insert({ company_id: companyId, folder_id: folderId, title: title.trim(), content: content || '', created_by: profile?.id ?? user.id })
    .select('id')
    .single()
  if (error) return { error: error.message, id: null }
  return { error: null, id: data.id }
}

export async function updateDocumentAction(
  companyId: string,
  documentId: string,
  title: string,
  content: string
) {
  if (!(await canEditDocuments(companyId))) return { error: 'No permission.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('documents')
    .update({ title: title.trim(), content, updated_by: profile?.id ?? user.id, updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .eq('company_id', companyId)
  return error ? { error: error.message } : { error: null }
}

export async function deleteDocumentAction(companyId: string, documentId: string) {
  if (!(await canDeleteDocuments(companyId))) return { error: 'No permission.' }
  const { error } = await (await createClient()).schema(APP_SCHEMA).from('documents').delete().eq('id', documentId).eq('company_id', companyId)
  return error ? { error: error.message } : { error: null }
}
