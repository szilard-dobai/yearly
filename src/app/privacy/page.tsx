import Header from '@/components/Header'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What Yearly stores, what it sends to its servers, and how to get your data deleted.',
  alternates: { canonical: '/privacy' },
}

const LAST_UPDATED = '7 November 2026'

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

function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>
}

const linkClassName =
  'underline underline-offset-2 hover:text-gray-900 dark:hover:text-zinc-100'

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-3 py-12 md:py-16">
        <article className="mx-auto max-w-2xl space-y-10 leading-relaxed text-gray-700 dark:text-zinc-300">
          <header className="space-y-3">
            <h1 className="font-serif text-4xl font-normal text-gray-900 md:text-5xl dark:text-zinc-100">
              Privacy
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-500">
              Last updated {LAST_UPDATED}
            </p>
            <p>
              Yearly is a personal project by Szilard Dobai. This page explains
              what Yearly stores, what it sends to our servers, and how to get
              your data deleted. There are no accounts and no ads, and we
              don&apos;t sell your data.
            </p>
          </header>

          <Section title="Your trips">
            <p>
              The trips and settings you add are saved in your browser&apos;s
              local storage, on your device. We never receive the dates of your
              trips, and images you export are created in your browser rather
              than uploaded to us.
            </p>
          </Section>

          <Section title="Usage events">
            <p>
              We record what people do in Yearly, such as opening a page, adding
              a trip or exporting an image. Each event includes:
            </p>
            <List>
              <li>
                a random ID created in your browser, which isn&apos;t linked to
                your name
              </li>
              <li>
                what happened and when, with details such as the year or how
                many days you added
              </li>
              <li>your device type: mobile, tablet or desktop</li>
              <li>
                your approximate location (country and region), which our host
                works out from your IP address. We don&apos;t store the IP
                address itself.
              </li>
            </List>
            <p>
              When you add or remove a trip, the event includes the country and
              how many days, but not the dates. When you export or download an
              image, or export a JSON backup, it includes the countries you
              logged that year, how many days you logged in each and how many
              separate trips that makes, so we can see which countries are most
              popular and how long people travel for. It never includes dates.
            </p>
            <p>
              When you open a page, the event also records how you found Yearly:
            </p>
            <List>
              <li>
                the address of the site or app that sent you, if your browser
                shares it, without the part after a &quot;?&quot; or
                &quot;#&quot;
              </li>
              <li>
                any campaign tags in the link you followed, such as
                utm_source=instagram
              </li>
              <li>
                your browser&apos;s user agent, a line of text every browser
                sends to websites. It names your browser and its version, your
                operating system, sometimes your phone model, and the app
                you&apos;re in if you opened Yearly inside an app such as
                Instagram or TikTok. We also store the name of that app.
              </li>
            </List>
            <p>
              We also use Vercel Web Analytics and Speed Insights to count page
              views and measure loading speed. They don&apos;t use cookies.
            </p>
          </Section>

          <Section title="Feedback">
            <p>
              If you send feedback, we store your rating and message with the
              random ID, your browser&apos;s user agent, your device type and
              approximate location. We get a Slack notification with your
              rating, message and approximate location.
            </p>
          </Section>

          <Section title="How you heard about Yearly">
            <p>
              After you download an image, we may ask how you heard about
              Yearly. If you answer, we store your answer as a usage event,
              along with the note you typed if you chose Other. If you answer or
              close the question, we won&apos;t ask again in that browser.
            </p>
          </Section>

          <Section title="Animated video waitlist">
            <p>
              If you join the waitlist for animated videos, we store your email
              address with the random ID, the video and price you were shown,
              your device type and approximate location.
            </p>
            <p>
              We only use your email to tell you when animated videos are
              available. We won&apos;t send newsletters or marketing. The Slack
              notification we get about a new sign-up doesn&apos;t include your
              email. Ask us and we&apos;ll delete it.
            </p>
          </Section>

          <Section title="Year-end reminder">
            <p>
              After you export an image, Yearly can remind you on 1 December,
              when year-in-review season starts. You can choose how:
            </p>
            <List>
              <li>
                <span className="font-medium">Apple or Outlook calendar:</span>{' '}
                your browser creates a calendar file and nothing is sent to us.
              </li>
              <li>
                <span className="font-medium">Google Calendar:</span> we open
                Google Calendar with the event filled in, and you save it to
                your own calendar.
              </li>
              <li>
                <span className="font-medium">Email:</span> we store your email
                address with the year, the random ID, your device type,
                approximate location and when you signed up.
              </li>
            </List>
            <p>
              We use your email to send you one reminder, on 1 December of that
              year. Nothing else: no newsletters or marketing. To send it,
              we&apos;ll pass your address to an email delivery service for that
              one message. Ask us and we&apos;ll delete your email at any time.
            </p>
            <p>
              Our usage events record when you open the reminder options or add
              the reminder to a calendar, and which calendar, but never your
              email address.
            </p>
          </Section>

          <Section title="Who handles the data">
            <List>
              <li>Vercel hosts Yearly and provides the analytics.</li>
              <li>
                MongoDB stores usage events, feedback, the waitlist and year-end
                reminder emails.
              </li>
              <li>
                Slack receives our notifications about feedback and waitlist
                sign-ups.
              </li>
            </List>
            <p>We don&apos;t share your data with anyone else.</p>
          </Section>

          <Section title="Storage on your device">
            <p>
              Yearly uses your browser&apos;s local storage for your trips,
              settings and the random ID, and to remember small things such as
              whether you&apos;ve seen a tip, answered a question or set a
              year-end reminder. It doesn&apos;t set cookies for visitors. The
              only cookie is the sign-in cookie for Yearly&apos;s admin pages.
            </p>
          </Section>

          <Section title="Deleting your data">
            <List>
              <li>
                To delete your trips and settings, clear your browser&apos;s
                data for this site. You can also clear one year at a time with{' '}
                <span className="font-medium">Reset Calendar</span> in the
                app&apos;s settings.
              </li>
              <li>
                To remove your email from the waitlist or the year-end reminder,
                or to ask about or delete anything else we hold, message{' '}
                <a
                  href="https://www.instagram.com/yearly.world"
                  target="_blank"
                  rel="noreferrer"
                  className={linkClassName}
                >
                  @yearly.world
                </a>{' '}
                on Instagram or send a message through the feedback form in{' '}
                <Link href="/create" className={linkClassName}>
                  the app
                </Link>
                . The feedback form includes your random ID, which lets us find
                the events linked to your browser.
              </li>
            </List>
          </Section>

          <Section title="Changes">
            <p>
              If we change how Yearly handles data, we&apos;ll update this page
              and the date at the top.
            </p>
          </Section>
        </article>
      </main>
    </>
  )
}
