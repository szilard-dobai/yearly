import AccountDetails from '@/components/account/AccountDetails'
import SignInForm from '@/components/account/SignInForm'
import Header from '@/components/Header'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StandardCard } from '@/components/ui/card-variants'
import { getGoogleCredentials } from '@/lib/auth/config'
import { getSession } from '@/lib/auth/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Account',
  robots: { index: false, follow: false },
}

interface AccountPageProps {
  searchParams: Promise<{ error?: string | string[] }>
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const [session, { error }] = await Promise.all([getSession(), searchParams])

  return (
    <>
      <Header />
      <main className="container mx-auto px-3 py-12 md:py-16">
        <div className="mx-auto max-w-md space-y-6">
          <h1 className="font-serif text-4xl font-normal text-gray-900 dark:text-zinc-100">
            {session ? 'Your account' : 'Sign in'}
          </h1>

          {!session && error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
            >
              Sign-in didn&apos;t work. The link may have expired or already
              been used. Try again below.
            </p>
          )}

          <StandardCard>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                {session ? 'Signed in' : 'No password needed'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {session ? (
                <AccountDetails email={session.user.email} />
              ) : (
                <SignInForm googleEnabled={getGoogleCredentials() !== null} />
              )}
            </CardContent>
          </StandardCard>

          <p className="text-sm text-gray-500 dark:text-zinc-500">
            Signing in is optional. Your calendar stays on this device either
            way.
          </p>
        </div>
      </main>
    </>
  )
}
