import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { canReadDocuments, canEditDocuments } from '@/lib/permissions'
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
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href={`/dashboard/companies/${slug}/documents`} className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">← Documents</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{doc.title}</h1>
      </div>
      <DocumentEditor
        companyId={company.id}
        documentId={doc.id}
        slug={slug}
        initialTitle={doc.title}
        initialContent={doc.content}
        canEdit={canEdit}
      />
    </div>
  )
}
