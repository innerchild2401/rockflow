import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { canReadDocuments, canEditDocuments } from '@/lib/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import DocumentEditor from './DocumentEditor'

const APP_SCHEMA = 'app'

export default async function DocumentPage({
  params,
}: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: company } = await supabase.schema(APP_SCHEMA).from('companies').select('id, name, slug').eq('slug', slug).single()
  if (!company) notFound()

  const canRead = await canReadDocuments(company.id)
  if (!canRead) notFound()

  const { data: doc } = await supabase
    .schema(APP_SCHEMA)
    .from('documents')
    .select('id, title, content, folder_id, updated_at')
    .eq('id', id)
    .eq('company_id', company.id)
    .single()

  if (!doc) notFound()
  const canEdit = await canEditDocuments(company.id)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        backHref={`/dashboard/companies/${slug}/documents`}
        backLabel="Documents"
        title={doc.title}
      />
      <Card>
        <DocumentEditor
          companyId={company.id}
          documentId={doc.id}
          slug={slug}
          initialTitle={doc.title}
          initialContent={doc.content}
          canEdit={canEdit}
        />
      </Card>
    </div>
  )
}
