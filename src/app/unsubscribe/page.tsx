import Header from '@/components/Header'
import UnsubscribeForm from '@/components/UnsubscribeForm'
import { formatFreeVideoLastDay } from '@/lib/video-offer'
import { readUnsubscribeToken } from '@/lib/waitlist/unsubscribe'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Unsubscribe',
  robots: { index: false, follow: false },
}

const CONTACT_EMAIL = 'hello@yearly.world'

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string | string[] }>
}

export default async function UnsubscribePage({
  searchParams,
}: UnsubscribePageProps) {
  const { token } = await searchParams
  const validToken =
    typeof token === 'string' && readUnsubscribeToken(token) ? token : null

  return (
    <>
      <Header />
      <main className="container mx-auto px-3 py-12 md:py-16">
        <div className="mx-auto max-w-md space-y-6 leading-relaxed text-gray-700 dark:text-zinc-300">
          <h1 className="font-serif text-4xl font-normal text-gray-900 dark:text-zinc-100">
            {validToken
              ? 'Leave the video waitlist?'
              : "This link doesn't work"}
          </h1>
          {validToken ? (
            <UnsubscribeForm
              token={validToken}
              freeUntil={formatFreeVideoLastDay()}
              contactEmail={CONTACT_EMAIL}
            />
          ) : (
            <p>
              Email{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline underline-offset-2 hover:text-gray-900 dark:hover:text-zinc-100"
              >
                {CONTACT_EMAIL}
              </a>{' '}
              and we&apos;ll take you off the list.
            </p>
          )}
        </div>
      </main>
    </>
  )
}
