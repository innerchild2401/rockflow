import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { canReadDocuments, canManageFolders, canCreateDocuments, canEditDocuments } from '@/lib/permissions'
import DocumentsList from './DocumentsList'
import CreateFolderForm from './CreateFolderForm'
import CreateDocumentForm from './CreateDocumentForm'
import UploadDocumentsForm from './UploadDocumentsForm'

const APP_SCHEMA = 'app'

export default async function DocumentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: company } = await supabase.schema(APP_SCHEMA).from('companies').select('id, name, slug').eq('slug', slug).single()
  if (!company) notFound()

  const canRead = await canReadDocuments(company.id)
  if (!canRead) notFound()

  const canManageFolder = await canManageFolders(company.id)
  const canCreate = await canCreateDocuments(company.id)

  const { data: folders } = await supabase
    .schema(APP_SCHEMA)
    .from('folders')
    .select('id, parent_folder_id, name')
    .eq('company_id', company.id)
    .order('name')

  const { data: documents } = await supabase
    .schema(APP_SCHEMA)
    .from('documents')
    .select('id, folder_id, title, updated_at')
    .eq('company_id', company.id)
    .order('updated_at', { ascending: false })

  const foldersList = (folders ?? []) as { id: string; parent_folder_id: string | null; name: string }[]
  const documentsList = (documents ?? []) as { id: string; folder_id: string | null; title: string; updated_at: string }[]

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href={`/dashboard/companies/${slug}`} className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">← {company.name}</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Documents</h1>
      </div>

      {canManageFolder && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">New folder</h2>
          <CreateFolderForm companyId={company.id} slug={slug} parentFolderId={null} folders={foldersList} />
        </div>
      )}

      {canCreate && (
        <>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Upload documents</h2>
            <UploadDocumentsForm companyId={company.id} slug={slug} folders={foldersList} />
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">New document</h2>
            <CreateDocumentForm companyId={company.id} slug={slug} folders={foldersList} />
          </div>
        </>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="border-b border-zinc-200 px-6 py-4 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-50">All documents</h2>
        <DocumentsList slug={slug} folders={foldersList} documents={documentsList} canEdit={await canEditDocuments(company.id)} />
      </div>
    </div>
  )
}
