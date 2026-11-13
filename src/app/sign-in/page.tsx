import SignInForm from '@/components/account/SignInForm'
import Header from '@/components/Header'
import { CardContent } from '@/components/ui/card'
import { StandardCard } from '@/components/ui/card-variants'
import { detectInAppBrowser } from '@/lib/attribution/in-app-browser'
import { getGoogleCredentials, isAccountsEnabled } from '@/lib/auth/config'
import { safeNextPath } from '@/lib/auth/next-path'
import { getSession } from '@/lib/auth/server'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
}

interface SignInPageProps {
  searchParams: Promise<{
    next?: string | string[]
    error?: string | string[]
  }>
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  if (!isAccountsEnabled()) notFound()

  const [session, params, requestHeaders] = await Promise.all([
    getSession(),
    searchParams,
    headers(),
  ])
  const next = safeNextPath(params.next)
  if (session) redirect(next)

  const inAppBrowser = detectInAppBrowser(
    requestHeaders.get('user-agent') ?? ''
  )
  const googleEnabled = getGoogleCredentials() !== null && !inAppBrowser

  return (
    <>
      <Header />
      <main className="container mx-auto px-3 py-12 md:py-16">
        <div className="mx-auto max-w-md space-y-6">
          <div className="space-y-2">
            <h1 className="font-serif text-4xl font-normal text-gray-900 dark:text-zinc-100">
              Sign in
            </h1>
            <p className="text-gray-600 dark:text-zinc-400">
              We&apos;ll email you a 6-digit code. No password needed.
            </p>
          </div>

          {params.error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
            >
              Google sign-in didn&apos;t work. Try again, or use your email.
            </p>
          )}

          <StandardCard>
            <CardContent>
              <SignInForm googleEnabled={googleEnabled} next={next} />
            </CardContent>
          </StandardCard>

          <p className="text-sm text-gray-500 dark:text-zinc-500">
            You don&apos;t need an account to make or download your calendar.
          </p>
        </div>
      </main>
    </>
  )
}
