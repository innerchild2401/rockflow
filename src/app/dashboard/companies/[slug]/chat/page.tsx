import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { canReadDocuments } from '@/lib/permissions'
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
      <div>
        <Link href={`/dashboard/companies/${slug}`} className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">← {company.name}</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Chat (RAG)</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Ask questions about your company documents. Answers are based on uploaded content (GPT-4o mini).</p>
      </div>
      <ChatClient companyId={company.id} slug={slug} />
    </div>
  )
}
