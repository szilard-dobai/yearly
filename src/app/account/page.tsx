import AccountCalendar from '@/components/account/AccountCalendar'
import AccountDetails from '@/components/account/AccountDetails'
import DeleteAccount from '@/components/account/DeleteAccount'
import Header from '@/components/Header'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StandardCard } from '@/components/ui/card-variants'
import { isAccountsEnabled } from '@/lib/auth/config'
import { getSession } from '@/lib/auth/server'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
}

export default async function AccountPage() {
  if (!isAccountsEnabled()) notFound()

  const session = await getSession()
  if (!session) redirect('/sign-in?next=/account')

  return (
    <>
      <Header />
      <main className="container mx-auto px-3 py-12 md:py-16">
        <div className="mx-auto max-w-md space-y-6">
          <h1 className="font-serif text-4xl font-normal text-gray-900 dark:text-zinc-100">
            Your account
          </h1>

          <StandardCard>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Your calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AccountCalendar userId={session.user.id} />
            </CardContent>
          </StandardCard>

          <StandardCard>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Signed in as
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AccountDetails
                userId={session.user.id}
                email={session.user.email}
              />
            </CardContent>
          </StandardCard>

          <StandardCard>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Delete account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DeleteAccount />
            </CardContent>
          </StandardCard>
        </div>
      </main>
    </>
  )
}
