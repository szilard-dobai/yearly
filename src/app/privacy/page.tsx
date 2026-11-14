import Header from '@/components/Header'
import { isAccountsEnabled } from '@/lib/auth/enabled'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What Yearly stores, what it sends to its servers, and how to get your data deleted.',
  alternates: { canonical: '/privacy' },
}

const LAST_UPDATED = '14 November 2026'
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

function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>
}

const linkClassName =
  'underline underline-offset-2 hover:text-gray-900 dark:hover:text-zinc-100'

const email = (
  <a href={`mailto:${CONTACT_EMAIL}`} className={linkClassName}>
    {CONTACT_EMAIL}
  </a>
)

export default function PrivacyPage() {
  const accounts = isAccountsEnabled()

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
              Yearly is a small, independent project. This page explains what
              Yearly stores, what it sends to our servers, and how to get your
              data deleted.{' '}
              {accounts
                ? "Accounts are optional, there are no ads, and we don't sell your data."
                : "There are no accounts and no ads, and we don't sell your data."}
            </p>
          </header>

          <Section title="Who we are">
            <p>
              Yearly is run by Szilard Dobai, in Romania, who is responsible for
              your data (the controller, in data protection terms). For anything
              on this page, email {email}.
            </p>
          </Section>

          <Section title="Your trips">
            {accounts ? (
              <>
                <p>
                  If you don&apos;t sign in, the trips and settings you add are
                  saved only in your browser&apos;s local storage, on your
                  device. We never receive the dates of your trips.
                </p>
                <p>
                  If you sign in, we also save your trips to your account: the
                  countries and the days you were in each. That&apos;s how your
                  calendar shows up on your other devices. Your settings stay on
                  each device.
                </p>
                <p>
                  Images you export are always created in your browser rather
                  than uploaded to us.
                </p>
              </>
            ) : (
              <p>
                The trips and settings you add are saved in your browser&apos;s
                local storage, on your device. We never receive the dates of
                your trips, and images you export are created in your browser
                rather than uploaded to us.
              </p>
            )}
          </Section>

          {accounts && (
            <Section title="Your account">
              <p>An account is optional. If you create one, we store:</p>
              <List>
                <li>your email address, which you sign in with</li>
                <li>your saved trips, as described above</li>
                <li>
                  for each device you&apos;re signed in on, when you signed in,
                  when that session ends and your browser&apos;s user agent. We
                  don&apos;t store your IP address.
                </li>
                <li>
                  if you sign in with Google, the name on your Google account,
                  which we use only for the initials on your account icon, and a
                  link between your Yearly account and your Google account. We
                  don&apos;t keep your Google profile photo or any access to
                  your Google account.
                </li>
              </List>
              <p>
                When you sign in by email, we send you a 6-digit code. We store
                only a scrambled copy of it, and it expires after 10 minutes.
              </p>
              <p>
                We use your email address to sign you in and to reply if you
                write to us. We don&apos;t send newsletters or marketing to it.
              </p>
              <p>
                You stay signed in on a device for up to 60 days, or until you
                sign out. Signing out removes your trips from that device. They
                stay saved in your account.
              </p>
            </Section>
          )}

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
            <p>
              To stop recording your visits in this browser, turn off{' '}
              <span className="font-medium">Share usage stats</span> in the
              app&apos;s settings. That also stops Vercel Web Analytics and
              Speed Insights.
            </p>
            {accounts && (
              <p>
                When you sign in, sign out or delete your account, the event
                records that it happened and how, such as by email code or
                Google. The first time a device syncs with your account, it
                records whether you added that device&apos;s trips to your
                account. These events never include your email address.
              </p>
            )}
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
              the launch offer we made you, your device type and approximate
              location.
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
                your browser creates a calendar file.
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
              When you add the reminder to a calendar, we store the random ID,
              which calendar, the year, your device type and approximate
              location. We never see anything in your calendar.
            </p>
            <p>
              We use your email to send you one reminder, on 1 December of that
              year. Nothing else: no newsletters or marketing. To send it,
              we&apos;ll pass your address to an email delivery service for that
              one message. Ask us and we&apos;ll delete your email at any time.
            </p>
            <p>
              Each new reminder, by email or calendar, is posted to a private
              Slack channel with your approximate location, your device type and
              how you set it. Our usage events record when you open the reminder
              options or add the reminder to a calendar, and which calendar.
              Neither ever includes your email address.
            </p>
          </Section>

          <Section title="Why we use your data">
            <p>
              Data protection law asks for a legal basis for each use of your
              data. These are ours:
            </p>
            <List>
              <li>
                Usage events, feedback and how you heard about Yearly: our
                legitimate interest in understanding how Yearly is used and
                improving it. You can object at any time, for example by turning
                off Share usage stats.
              </li>
              <li>
                The video waitlist and the year-end reminder email: your
                consent. You can withdraw it at any time.
              </li>
              {accounts && (
                <>
                  <li>
                    Your account and saved trips: providing the account you
                    asked for.
                  </li>
                  <li>
                    Sign-in sessions, sign-in codes and limits on sign-in
                    attempts: our legitimate interest in keeping accounts
                    secure.
                  </li>
                </>
              )}
              <li>
                Slack notifications: our legitimate interest in reading feedback
                and keeping track of sign-ups.
              </li>
            </List>
          </Section>

          <Section title="How long we keep it">
            <List>
              <li>
                Usage events: in full for 26 months. After that we remove the
                random ID, your region, the user agent, the app you opened
                Yearly in, the site that sent you, campaign tags and any note
                you typed, and keep only the day each event happened. We delete
                what&apos;s left after 5 years.
              </li>
              <li>
                Reminders added to a calendar: in full for 26 months, then
                without the random ID and region. We delete them after 5 years.
              </li>
              <li>
                Feedback: in full for 26 months, then without the random ID,
                user agent and region. We delete it after 5 years.
              </li>
              <li>
                Year-end reminder emails: until the end of the year the reminder
                is for.
              </li>
              <li>
                Video waitlist emails: until 12 months after animated videos
                launch.
              </li>
              {accounts && (
                <>
                  <li>
                    Your account and saved trips: until you delete your account.
                    If you don&apos;t sign in for 5 years, we&apos;ll email you,
                    then delete the account 30 days later.
                  </li>
                  <li>
                    Sign-in sessions: up to 60 days. Sign-in codes: 10 minutes.
                  </li>
                </>
              )}
            </List>
          </Section>

          <Section title="Who handles the data">
            <List>
              <li>Vercel hosts Yearly and provides the analytics.</li>
              <li>
                MongoDB stores usage events, feedback, the waitlist and year-end
                reminders.
              </li>
              {accounts && (
                <>
                  <li>
                    Neon stores accounts and saved trips, on servers in
                    Frankfurt, Germany.
                  </li>
                  <li>Resend sends sign-in codes, from servers in Ireland.</li>
                  <li>
                    Google handles sign-in if you choose Continue with Google.
                  </li>
                </>
              )}
              <li>
                Slack receives our notifications about feedback, waitlist
                sign-ups and year-end reminders.
              </li>
            </List>
            <p>We don&apos;t share your data with anyone else.</p>
          </Section>

          <Section title="Where your data is stored">
            <p>
              Our servers and databases are in Frankfurt, Germany. Some of the
              companies we use are based in the US: Vercel, MongoDB and Slack
              {accounts ? ', and for accounts, Neon, Resend and Google' : ''}.
              Slack keeps our notifications in the US, and the others may access
              your data from outside the European Economic Area. Their data
              processing terms cover these transfers through the EU–US Data
              Privacy Framework or the European Commission&apos;s standard
              contractual clauses.
            </p>
          </Section>

          <Section title="Storage on your device">
            <p>
              Yearly uses your browser&apos;s local storage for your trips,
              settings and the random ID, and to remember small things such as
              whether you&apos;ve seen a tip, answered a question, set a
              year-end reminder or turned off usage stats.{' '}
              {accounts
                ? "If you sign in, it also keeps a copy of the calendar it last saved to your account, so it can combine changes from your other devices. Yearly sets a cookie only when you sign in, to keep you signed in. Yearly's admin pages have their own sign-in cookie."
                : "It doesn't set cookies for visitors. The only cookie is the sign-in cookie for Yearly's admin pages."}
            </p>
          </Section>

          <Section title="Your rights">
            <p>You can ask us to:</p>
            <List>
              <li>tell you what data we hold about you and send you a copy</li>
              <li>correct it</li>
              <li>delete it</li>
              <li>stop or limit using it, including for usage stats</li>
              <li>send it to you in a format you can reuse elsewhere</li>
            </List>
            <p>
              You can also withdraw any consent you gave us, such as for the
              waitlist or the reminder email. Email {email} and we&apos;ll reply
              within one month. We don&apos;t make automated decisions about
              you.
            </p>
            <p>
              If you&apos;re unhappy with how we handle your data, you can
              complain to Romania&apos;s data protection authority, ANSPDCP (
              <a
                href="https://www.dataprotection.ro"
                target="_blank"
                rel="noreferrer"
                className={linkClassName}
              >
                dataprotection.ro
              </a>
              ), or to the authority where you live, such as the ICO in the UK.
            </p>
          </Section>

          <Section title="Deleting your data">
            <List>
              {accounts && (
                <li>
                  To delete your account and the trips saved to it, use{' '}
                  <span className="font-medium">Delete account</span> on your{' '}
                  <Link href="/account" className={linkClassName}>
                    account page
                  </Link>
                  . It takes effect right away, and copies in our database
                  provider&apos;s backups are gone within 7 days. Trips on your
                  device stay there until you clear them. Deleting your account
                  doesn&apos;t remove your email from the video waitlist or the
                  year-end reminder, so ask us if you&apos;d like that too.
                </li>
              )}
              <li>
                To delete your trips and settings, clear your browser&apos;s
                data for this site. You can also clear one year at a time with{' '}
                <span className="font-medium">Reset Calendar</span> in the
                app&apos;s settings.
              </li>
              <li>
                To remove your email from the waitlist or the year-end reminder,
                or to ask about or delete anything else we hold, email {email},
                message{' '}
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

          <Section title="Children">
            <p>
              If you&apos;re under 16, ask a parent or guardian before you give
              us your email address for the waitlist, a reminder
              {accounts ? ' or an account' : ''}.
            </p>
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
