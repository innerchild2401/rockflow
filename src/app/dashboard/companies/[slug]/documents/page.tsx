import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { canReadDocuments, canManageFolders, canCreateDocuments } from '@/lib/permissions'
import { NoPermission } from '@/components/ui/NoPermission'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import DocumentsToolbar from './DocumentsToolbar'
import DocumentsList from './DocumentsList'

const APP_SCHEMA = 'app'

export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ folder?: string }>
}) {
  const { slug } = await params
  const { folder: folderIdParam } = await searchParams
  const currentFolderId = folderIdParam && folderIdParam.trim() ? folderIdParam.trim() : null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: company } = await supabase.schema(APP_SCHEMA).from('companies').select('id, name, slug').eq('slug', slug).single()
  if (!company) notFound()

  const canRead = await canReadDocuments(company.id)
  if (!canRead) {
    return (
      <NoPermission
        title="You don't have permission to view documents"
        backHref={`/dashboard/companies/${slug}`}
        backLabel={company.name}
      />
    )
  }

  const canManageFolder = await canManageFolders(company.id)
  const canCreate = await canCreateDocuments(company.id)

  let currentFolderName: string | null = null
  if (currentFolderId) {
    const { data: folder } = await supabase
      .schema(APP_SCHEMA)
      .from('folders')
      .select('id, name')
      .eq('id', currentFolderId)
      .eq('company_id', company.id)
      .single()
    if (folder) currentFolderName = folder.name
    else notFound()
  }

  const foldersQuery = supabase
    .schema(APP_SCHEMA)
    .from('folders')
    .select('id, name')
    .eq('company_id', company.id)
    .order('name')

  if (currentFolderId) {
    foldersQuery.eq('parent_folder_id', currentFolderId)
  } else {
    foldersQuery.is('parent_folder_id', null)
  }
  const { data: subfolders } = await foldersQuery

  const documentsQuery = supabase
    .schema(APP_SCHEMA)
    .from('documents')
    .select('id, title, updated_at, file_name, file_size_bytes')
    .eq('company_id', company.id)
    .order('updated_at', { ascending: false })

  if (currentFolderId) {
    documentsQuery.eq('folder_id', currentFolderId)
  } else {
    documentsQuery.is('folder_id', null)
  }
  const { data: documents } = await documentsQuery

  const subfoldersList = (subfolders ?? []) as { id: string; name: string }[]
  const documentsList = (documents ?? []) as {
    id: string
    title: string
    updated_at: string
    file_name: string | null
    file_size_bytes: number | null
  }[]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        backHref={`/dashboard/companies/${slug}`}
        backLabel={company.name}
        title="Documents"
        description="Browse folders and open documents. Upload or create folders from the toolbar."
      />

      <DocumentsToolbar
        slug={slug}
        companyId={company.id}
        currentFolderId={currentFolderId}
        currentFolderName={currentFolderName}
        canManageFolder={canManageFolder}
        canCreate={canCreate}
      />

      <Card padding="none">
        <DocumentsList
          slug={slug}
          subfolders={subfoldersList}
          documents={documentsList}
          currentFolderId={currentFolderId}
        />
      </Card>
    </div>
  )
}
