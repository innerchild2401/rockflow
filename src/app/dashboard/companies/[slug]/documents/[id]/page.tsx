import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { canReadDocuments, canEditDocuments, canDeleteDocuments } from '@/lib/permissions'
import { NoPermission } from '@/components/ui/NoPermission'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import DocumentView from './DocumentView'

const APP_SCHEMA = 'app'

export default async function DocumentPage({
  params,
  searchParams,
}: { 
  params: Promise<{ slug: string; id: string }>
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { slug, id } = await params
  const { returnTo } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: company } = await supabase.schema(APP_SCHEMA).from('companies').select('id, name, slug').eq('slug', slug).single()
  if (!company) notFound()

  const canRead = await canReadDocuments(company.id)
  if (!canRead) {
    return (
      <NoPermission
        title="You don't have permission to view this document"
        backHref={`/dashboard/companies/${slug}/documents`}
        backLabel="Documents"
      />
    )
  }

  const { data: doc } = await supabase
    .schema(APP_SCHEMA)
    .from('documents')
    .select('id, title, content, folder_id, updated_at, file_name, file_size_bytes, file_type')
    .eq('id', id)
    .eq('company_id', company.id)
    .single()

  if (!doc) notFound()

  const canEdit = await canEditDocuments(company.id)
  const canDelete = await canDeleteDocuments(company.id)

  const { data: folders } = await supabase
    .schema(APP_SCHEMA)
    .from('folders')
    .select('id, name')
    .eq('company_id', company.id)
    .order('name')

  const foldersList = (folders ?? []) as { id: string; name: string }[]

  const backHref = returnTo || `/dashboard/companies/${slug}/documents`
  const backLabel = returnTo ? 'Back' : 'Documents'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        backHref={backHref}
        backLabel={backLabel}
        title={doc.title}
      />
      <Card>
        <DocumentView
          companyId={company.id}
          documentId={doc.id}
          slug={slug}
          title={doc.title}
          content={doc.content}
          fileName={doc.file_name}
          fileSizeBytes={doc.file_size_bytes}
          fileType={doc.file_type}
          currentFolderId={doc.folder_id}
          folders={foldersList}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </Card>
    </div>
  )
}
