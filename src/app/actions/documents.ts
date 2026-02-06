'use server'

import { createClient } from '@/lib/supabase/server'
import {
  canCreateDocuments,
  canEditDocuments,
  canDeleteDocuments,
  canManageFolders,
} from '@/lib/permissions'
import { chunkText } from '@/lib/chunking'
import { isAllowedDocumentFilename, getDocumentTitleFromFilename, MAX_UPLOAD_BYTES } from '@/lib/upload-types'
import { extractTextFromBuffer, isBinaryExtension } from '@/lib/extract-document-text'
import { embedTexts } from '@/lib/openai'
import { insertAuditLog } from './audit'

const APP_SCHEMA = 'app'

/** Sync document_chunks for a document (RAG prep). Deletes existing chunks, generates embeddings via OpenAI, inserts. */
async function syncChunksForDocument(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: string,
  companyId: string,
  content: string
) {
  await supabase.schema(APP_SCHEMA).from('document_chunks').delete().eq('document_id', documentId)
  const chunks = chunkText(content)
  if (chunks.length === 0) return
  let embeddings: number[][] = []
  try {
    embeddings = await embedTexts(chunks.map((c) => c.content))
  } catch {
    // OPENAI_API_KEY missing or error: store chunks without embeddings
  }
  const rows = chunks.map((c, i) => ({
    document_id: documentId,
    company_id: companyId,
    content: c.content,
    chunk_index: c.index,
    embedding: embeddings[i] ? `[${embeddings[i].join(',')}]` : null,
  }))
  await supabase.schema(APP_SCHEMA).from('document_chunks').insert(rows)
}

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
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Folder name is required.', id: null }
  const { data: existing } = await supabase
    .schema(APP_SCHEMA)
    .from('folders')
    .select('id')
    .eq('company_id', companyId)
    .is('parent_folder_id', parentFolderId)
    .ilike('name', trimmed)
    .limit(1)
    .maybeSingle()
  if (existing) return { error: 'A folder with this name already exists here.', id: null }
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const { data, error } = await supabase
    .schema(APP_SCHEMA)
    .from('folders')
    .insert({ company_id: companyId, parent_folder_id: parentFolderId, name: trimmed, created_by: profile?.id ?? user.id })
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
  if (data?.id && content?.trim() && (await canEditDocuments(companyId))) {
    await syncChunksForDocument(supabase, data.id, companyId, content.trim())
  }
  if (data?.id) {
    await insertAuditLog({
      company_id: companyId,
      user_id: profile?.id ?? user.id,
      action: 'created',
      entity_type: 'document',
      entity_id: data.id,
      new_value: { title: title.trim() },
    })
  }
  return { error: null, id: data.id }
}

export type UploadedFilePayload = { name: string; content: string }

/** Create one document per uploaded file (multiple files at once). Validates allowed extensions. */
export async function createDocumentsFromFilesAction(
  companyId: string,
  folderId: string | null,
  files: UploadedFilePayload[]
) {
  if (!(await canCreateDocuments(companyId)))
    return { error: 'No permission to create documents.', created: 0, skipped: [] as string[] }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', created: 0, skipped: [] as string[] }
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const canEdit = await canEditDocuments(companyId)
  const skipped: string[] = []
  let created = 0
  for (const f of files) {
    if (!isAllowedDocumentFilename(f.name)) {
      skipped.push(f.name)
      continue
    }
    const title = getDocumentTitleFromFilename(f.name).trim() || f.name
    const { data, error } = await supabase
      .schema(APP_SCHEMA)
      .from('documents')
      .insert({
        company_id: companyId,
        folder_id: folderId,
        title,
        content: f.content ?? '',
        created_by: profile?.id ?? user.id,
      })
      .select('id')
      .single()
    if (error) {
      if (error.code === '23505') return { error: `A document named "${title}" already exists in this folder.`, created, skipped }
      return { error: error.message, created, skipped }
    }
    if (data?.id && (f.content?.trim()) && canEdit) {
      await syncChunksForDocument(supabase, data.id, companyId, f.content.trim())
    }
    if (data?.id) {
      await insertAuditLog({
        company_id: companyId,
        user_id: profile?.id ?? user.id,
        action: 'created',
        entity_type: 'document',
        entity_id: data.id,
        new_value: { title, uploaded: true, file_name: f.name },
      })
    }
    created++
  }
  return { error: null, created, skipped }
}

/** Create documents from FormData (supports binary PDF/DOC/DOCX; server extracts text). */
export async function createDocumentsFromFormDataAction(formData: FormData) {
  const companyId = formData.get('companyId') as string
  const folderIdRaw = formData.get('folderId')
  const folderId = (folderIdRaw && String(folderIdRaw).trim()) || null
  if (!companyId) return { error: 'Missing companyId.', created: 0, skipped: [] as string[] }

  if (!(await canCreateDocuments(companyId)))
    return { error: 'No permission to create documents.', created: 0, skipped: [] as string[] }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', created: 0, skipped: [] as string[] }
  const { data: profile } = await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single()
  const canEdit = await canEditDocuments(companyId)
  const skipped: string[] = []
  let created = 0
  const files = formData.getAll('files') as File[]
  for (const file of files) {
    if (!file?.name || !isAllowedDocumentFilename(file.name)) {
      skipped.push(file?.name ?? 'unknown')
      continue
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      skipped.push(`${file.name} (over ${MAX_UPLOAD_BYTES / 1024 / 1024} MB limit)`)
      continue
    }
    let content: string
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      if (isBinaryExtension(file.name)) {
        content = await extractTextFromBuffer(buffer, file.name)
      } else {
        content = buffer.toString('utf-8').trim()
      }
    } catch (err) {
      skipped.push(file.name)
      continue
    }
    let title = getDocumentTitleFromFilename(file.name).trim() || file.name
    const { data, error } = await supabase
      .schema(APP_SCHEMA)
      .from('documents')
      .insert({
        company_id: companyId,
        folder_id: folderId,
        title,
        content: content ?? '',
        file_name: file.name,
        file_size_bytes: file.size,
        file_type: file.type || null,
        created_by: profile?.id ?? user.id,
      })
      .select('id')
      .single()
    if (error) {
      if (error.code === '23505') return { error: `A document named "${title}" already exists in this folder. Rename the file or choose a different folder.`, created, skipped }
      return { error: error.message, created, skipped }
    }
    if (data?.id && (content?.trim()) && canEdit) {
      await syncChunksForDocument(supabase, data.id, companyId, content.trim())
    }
    if (data?.id) {
      await insertAuditLog({
        company_id: companyId,
        user_id: profile?.id ?? user.id,
        action: 'created',
        entity_type: 'document',
        entity_id: data.id,
        new_value: { title, uploaded: true, file_name: file.name },
      })
    }
    created++
  }
  return { error: null, created, skipped }
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
  if (error) return { error: error.message }
  await syncChunksForDocument(supabase, documentId, companyId, content)
  return { error: null }
}

export async function moveDocumentAction(companyId: string, documentId: string, folderId: string | null) {
  if (!(await canEditDocuments(companyId))) return { error: 'No permission.' }
  const { error } = await (await createClient())
    .schema(APP_SCHEMA)
    .from('documents')
    .update({ folder_id: folderId, updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .eq('company_id', companyId)
  return error ? { error: error.message } : { error: null }
}

export async function deleteDocumentAction(companyId: string, documentId: string) {
  if (!(await canDeleteDocuments(companyId))) return { error: 'No permission.' }
  const supabase = await createClient()
  const { data: existing } = await supabase
    .schema(APP_SCHEMA)
    .from('documents')
    .select('title')
    .eq('id', documentId)
    .eq('company_id', companyId)
    .single()
  const { error } = await supabase
    .schema(APP_SCHEMA)
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('company_id', companyId)
  if (error) return { error: error.message }
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user ? await supabase.schema(APP_SCHEMA).from('profiles').select('id').eq('id', user.id).single() : { data: null }
  await insertAuditLog({
    company_id: companyId,
    user_id: profile?.id ?? user?.id ?? null,
    action: 'deleted',
    entity_type: 'document',
    entity_id: documentId,
    old_value: existing ? { title: existing.title } : null,
  })
  return { error: null }
}
