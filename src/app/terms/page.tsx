import Header from '@/components/Header'
import { isAccountsEnabled } from '@/lib/auth/enabled'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Terms',
  description:
    'The terms for using Yearly and its optional free accounts at yearly.world.',
  alternates: { canonical: '/terms' },
}

const LAST_UPDATED = '23 November 2026'
const GOVERNING_LAW = 'Romania'
const CONTACT_EMAIL = 'hello@yearly.world'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-2xl font-normal text-gray-900 dark:text-zinc-100">
        {title}
      </h2>
      {children}
    </section>
  )
}

const linkClassName =
  'underline underline-offset-2 hover:text-gray-900 dark:hover:text-zinc-100'

const email = (
  <a href={`mailto:${CONTACT_EMAIL}`} className={linkClassName}>
    {CONTACT_EMAIL}
  </a>
)

export default function TermsPage() {
  if (!isAccountsEnabled()) notFound()

  return (
    <>
      <Header />
      <main className="container mx-auto px-3 py-12 md:py-16">
        <article className="mx-auto max-w-2xl space-y-10 leading-relaxed text-gray-700 dark:text-zinc-300">
          <header className="space-y-3">
            <h1 className="font-serif text-4xl font-normal text-gray-900 md:text-5xl dark:text-zinc-100">
              Terms
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-500">
              Last updated {LAST_UPDATED}
            </p>
            <p>
              These terms cover your use of Yearly at yearly.world. Yearly is a
              small, independent project run by Szilard Dobai. If anything here
              is unclear, email {email}.
            </p>
          </header>

          <Section title="Using Yearly">
            <p>
              Making and downloading your calendar and stats images is free.
              Yearly is for your own travel, so please don&apos;t use it to
              break the law, sign up with automated tools or in bulk, get into
              other people&apos;s accounts, or try to overload or break the
              site.
            </p>
          </Section>

          <Section title="Your account">
            <p>
              An account is optional and free. You sign in with a code sent to
              your email or with Google, so keep access to that email address.
              You can delete your account at any time on your{' '}
              <Link href="/account" className={linkClassName}>
                account page
              </Link>
              . We may close an account that breaks these terms.
            </p>
          </Section>

          <Section title="Your trips and images">
            <p>
              Your trips are yours. We keep the ones saved to your account only
              to show them back to you on your devices, as the{' '}
              <Link href="/privacy" className={linkClassName}>
                Privacy page
              </Link>{' '}
              explains. The images you download are yours to post and share.
            </p>
          </Section>

          <Section title="If Yearly changes">
            <p>
              Yearly will change over time, and features may come and go. If we
              ever stop offering accounts, we&apos;ll email account holders at
              least 30 days before, so you can download a backup of your
              calendar.
            </p>
          </Section>

          <Section title="No guarantees">
            <p>
              We work to keep Yearly running and your data safe, but it&apos;s
              provided as is, without a promise that it will always be available
              or free of errors. Keep a backup of anything you can&apos;t afford
              to lose. As far as the law allows, we aren&apos;t responsible for
              indirect losses or lost data. This doesn&apos;t apply to injury or
              to harm we cause on purpose or through gross negligence, which the
              law doesn&apos;t let us limit. Nothing in these terms limits
              rights you have under consumer law that can&apos;t be limited.
            </p>
          </Section>

          <Section title="Paid videos">
            <p>
              We&apos;re testing an optional paid animated video. Before we sell
              anything, we&apos;ll add the terms for buying it, including
              refunds, to this page.
            </p>
          </Section>

          <Section title="Changes to these terms">
            <p>
              If we change these terms, we&apos;ll update this page and the date
              at the top. If a change affects account holders, we&apos;ll email
              them before it takes effect.
            </p>
          </Section>

          <Section title="Law">
            <p>
              These terms are governed by the law of {GOVERNING_LAW}. If you
              live in another country, you also keep the consumer protections
              its law gives you.
            </p>
          </Section>

          <Section title="Contact">
            <p>Questions about these terms: {email}.</p>
          </Section>
        </article>
      </main>
    </>
  )
}
