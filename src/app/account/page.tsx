import AccountCalendar from '@/components/account/AccountCalendar'
import { AccountCalendarStatusProvider } from '@/components/account/AccountCalendarStatus'
import AccountDetails from '@/components/account/AccountDetails'
import AccountReminder from '@/components/account/AccountReminder'
import AccountVideos from '@/components/account/AccountVideos'
import DeleteAccount from '@/components/account/DeleteAccount'
import Header from '@/components/Header'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StandardCard } from '@/components/ui/card-variants'
import { getSession } from '@/lib/auth/server'
import { isOpenReminderYear } from '@/lib/reminders/server'
import { isVideoSalesEnabled } from '@/lib/videos/enabled'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
}

export default async function AccountPage() {
  const session = await getSession()
  if (!session) redirect('/sign-in?next=/account')

  const reminderYear = new Date().getUTCFullYear()

  return (
    <>
      <Header />
      <main className="container mx-auto px-3 py-12 md:py-16">
        <AccountCalendarStatusProvider>
          <div className="mx-auto max-w-md space-y-6">
            <h1 className="font-serif text-4xl font-normal text-gray-900 dark:text-zinc-100">
              Your account
            </h1>

            {isVideoSalesEnabled() && <AccountVideos />}

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

            {isOpenReminderYear(reminderYear) && (
              <StandardCard>
                <CardHeader>
                  <CardTitle className="text-base font-medium">
                    Year-end reminder
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AccountReminder
                    year={reminderYear}
                    email={session.user.email}
                  />
                </CardContent>
              </StandardCard>
            )}

            <StandardCard>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Signed in as
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AccountDetails
                  userId={session.user.id}
                  name={session.user.name}
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
        </AccountCalendarStatusProvider>
      </main>
    </>
  )
}
