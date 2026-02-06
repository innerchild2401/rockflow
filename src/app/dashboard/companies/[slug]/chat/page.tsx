import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { canReadDocuments } from '@/lib/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import ChatClient from './ChatClient'

const APP_SCHEMA = 'app'

export default async function ChatPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: company } = await supabase.schema(APP_SCHEMA).from('companies').select('id, name, slug').eq('slug', slug).single()
  if (!company) notFound()

  const canRead = await canReadDocuments(company.id)
  if (!canRead) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        backHref={`/dashboard/companies/${slug}`}
        backLabel={company.name}
        title="Knowledge Base"
        description="Ask questions answered only from your company documents. Answers include citations and links to source paragraphs."
      />
      <Card padding="none" className="overflow-hidden">
        <ChatClient companyId={company.id} slug={slug} />
      </Card>
    </div>
  )
}
