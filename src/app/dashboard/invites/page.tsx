import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { getMyInvitesAction, type MyInvite } from '@/app/actions/invites'
import InvitesInboxClient from './InvitesInboxClient'

export default async function InvitesInboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error, invites } = await getMyInvitesAction()
  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Invites" description="Company invitations sent to you." />
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        title="Invites"
        description="Company invitations sent to you. Accept to join, or ignore/refuse."
      />
      <Card>
        <CardHeader title="Pending invitations" description="Accept to join, or ignore/refuse." />
        <CardContent>
          <InvitesInboxClient initialInvites={invites} />
        </CardContent>
      </Card>
    </div>
  )
}
