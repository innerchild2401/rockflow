import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { canReadDocuments, canManageFolders, canCreateDocuments, canEditDocuments } from '@/lib/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
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
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        backHref={`/dashboard/companies/${slug}`}
        backLabel={company.name}
        title="Documents"
        description="Folders and procedures for your company."
      />

      {canManageFolder && (
        <Card>
          <CardHeader title="New folder" />
          <CardContent>
            <CreateFolderForm companyId={company.id} slug={slug} parentFolderId={null} folders={foldersList} />
          </CardContent>
        </Card>
      )}

      {canCreate && (
        <>
          <Card>
            <CardHeader title="Upload documents" description="TXT, MD, CSV, JSON, HTML, XML, LOG, YAML, PDF, DOC, DOCX. Multiple files supported." />
            <CardContent>
              <UploadDocumentsForm companyId={company.id} slug={slug} folders={foldersList} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="New document" />
            <CardContent>
              <CreateDocumentForm companyId={company.id} slug={slug} folders={foldersList} />
            </CardContent>
          </Card>
        </>
      )}

      <Card padding="none">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">All documents</h2>
        </div>
        <DocumentsList slug={slug} folders={foldersList} documents={documentsList} canEdit={await canEditDocuments(company.id)} />
      </Card>
    </div>
  )
}
