import { ProductName, withProductName } from '@/components/ProductName'
import { ExampleVideo } from '@/components/ExampleVideo'
import { FreeVideoPrice } from '@/components/FreeVideoPrice'
import Header from '@/components/Header'
import { DarkCard, StandardCard } from '@/components/ui/card-variants'
import { VideoWaitlistForm } from '@/components/VideoWaitlistForm'
import { HOMEPAGE_EXAMPLES } from '@/lib/homepage-examples'
import type { VideoKind } from '@/lib/video'
import {
  formatPrice,
  VIDEO_LAUNCH_LABEL,
  VIDEO_PACK_PRICE,
} from '@/lib/video-offer'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

const title = 'Your year in travel, animated'
const description = `A short video of your calendar filling up with flags, then your travel stats. Join the list before launch in ${VIDEO_LAUNCH_LABEL} 2026 and your first video is free. Then ${formatPrice(VIDEO_PACK_PRICE)} per pack.`

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/videos' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Yearly',
    url: '/videos',
    title,
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
}

const PRICE = formatPrice(VIDEO_PACK_PRICE)
const CONTACT_EMAIL = 'hello@yearly.world'
const [YEAR_EXAMPLE, MONTH_EXAMPLE, STATS_EXAMPLE] = HOMEPAGE_EXAMPLES

const examples: {
  kind: VideoKind
  name: string
  pack: string
  label: string
  poster: (typeof HOMEPAGE_EXAMPLES)[number]
}[] = [
  {
    kind: 'year',
    name: 'Your year',
    pack: 'Year pack',
    label:
      'An example video: a 2026 travel calendar filling up with flags, day by day',
    poster: YEAR_EXAMPLE,
  },
  {
    kind: 'stats',
    name: 'Your stats',
    pack: 'Year pack',
    label:
      'An example video: travel stats for 2026 counting up, with the top countries',
    poster: STATS_EXAMPLE,
  },
  {
    kind: 'month',
    name: 'One month',
    pack: 'Month pack',
    label:
      "An example video: June 2026 filling up with flags, then the month's stats",
    poster: MONTH_EXAMPLE,
  },
]

const packs = [
  {
    name: 'Year pack',
    description:
      "Your whole year filling up with flags, plus a video of your year's numbers.",
    details: [
      '2 videos, each in dark and light',
      '1080×1920 MP4s, up to 14 seconds each',
    ],
  },
  {
    name: 'Month pack',
    description: "One month filling up with flags, then that month's numbers.",
    details: ['1 video, in dark and light', '1080×1920 MP4, up to 14 seconds'],
  },
]

const included = [
  'No PREVIEW watermark. Like the images, each video carries a small "made with yearly.world" signature.',
  'Up to 3 updates when you add trips later',
  'Download again from your account at any time',
]

const steps = [
  {
    title: 'Add your trips',
    description:
      "Make your calendar on yearly.world. That part is free and doesn't need an account.",
  },
  {
    title: 'Choose a pack',
    description: `Sign in with a free account, pick the year pack or a month pack, and pay ${PRICE} once.`,
  },
  {
    title: 'Save and post',
    description:
      "We make your videos right after you pay and email you when they're ready. Save them to your phone and post them anywhere that takes video.",
  },
]

const faqs = [
  {
    question: 'Do I have to pay to use Yearly?',
    answer:
      'No. Making and downloading your calendar and stats images is free and stays free. The videos are an optional extra.',
  },
  {
    question: 'When can I buy one?',
    answer: `Videos launch in ${VIDEO_LAUNCH_LABEL} 2026. Join the list and we'll email you once, when they're ready.`,
  },
  {
    question: 'Is the first video really free?',
    answer:
      'Yes, for everyone who joins the list before launch. You get one pack, year or month, your choice. Sign in with the email you joined with to claim it.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'Only to buy a video. The account is free, and you sign in with a code sent to your email or with Google. It keeps your videos so you can download them again.',
  },
  {
    question: 'What if I add trips after buying?',
    answer:
      'Update your video from your account, up to 3 times per pack. Updates are for adding trips or fixing mistakes, so most of the days in your first video need to stay.',
  },
  {
    question: 'Where can I post it?',
    answer:
      'Anywhere that takes video. Each video is a 1080×1920 MP4, the shape of Instagram Reels, Stories and TikTok.',
  },
]

const headingClassName =
  'font-serif text-3xl font-normal text-gray-900 md:text-4xl dark:text-zinc-100'
const linkClassName =
  'underline underline-offset-2 hover:text-gray-900 dark:hover:text-zinc-100'

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Check className="mt-1 size-4 shrink-0 text-emerald-500" />
      <span>{children}</span>
    </li>
  )
}

export default function VideosPage() {
  return (
    <>
      <Header>
        <Link
          href="/create"
          className="inline-flex h-9 items-center rounded-full bg-black px-4 whitespace-nowrap sm:px-6 text-white transition-colors hover:bg-gray-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <span className="sm:hidden">Create</span>
          <span className="hidden sm:inline">Make your calendar</span>
        </Link>
      </Header>

      <main className="container mx-auto px-3 py-6">
        <section className="pt-16 pb-12 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400">
              <Sparkles className="size-3.5" />
              Coming in {VIDEO_LAUNCH_LABEL}
            </span>
            <h1 className="mb-6 font-serif text-5xl leading-tight font-normal tracking-tight text-balance text-gray-900 sm:text-6xl dark:text-zinc-100">
              Your year in travel, animated.
            </h1>
            <p className="mx-auto mb-4 max-w-2xl text-xl leading-relaxed text-gray-600 dark:text-zinc-400">
              A short video made from your own trips. Your calendar fills up
              flag by flag, then your numbers count up. Each video is sized for
              Reels, Stories and TikTok.
            </p>
            <div className="mb-8">
              <p className="mb-2 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
                <FreeVideoPrice
                  className="text-3xl font-medium text-gray-900 dark:text-zinc-100"
                  freeClassName="text-emerald-600 dark:text-emerald-400"
                />
                <span className="text-lg text-gray-900 dark:text-zinc-100">
                  for your first video when you join the list before launch
                </span>
              </p>
              <p className="text-gray-600 dark:text-zinc-400">
                After that, {PRICE} per pack, paid once. Your calendar and stats
                images stay free.
              </p>
            </div>
            <div id="join" className="mx-auto max-w-xl scroll-mt-24">
              <VideoWaitlistForm />
            </div>
            <Link
              href="/create"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-gray-700 underline underline-offset-2 hover:text-gray-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              Or preview it with your own trips
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        <section className="py-12" aria-labelledby="examples-heading">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 id="examples-heading" className={`mb-3 ${headingClassName}`}>
                Made from your trips
              </h2>
              <p className="text-lg leading-relaxed text-gray-600 dark:text-zinc-400">
                Every video uses the trips on your calendar. These three come
                from an example year with 10 countries and 67 days abroad.
              </p>
            </div>
            <ul className="-mx-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-3 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-8 md:overflow-visible md:px-0">
              {examples.map((example) => (
                <li
                  key={example.kind}
                  className="w-[68%] shrink-0 snap-center md:w-auto"
                >
                  <ExampleVideo
                    kind={example.kind}
                    poster={example.poster}
                    label={example.label}
                  />
                  <p className="mt-3 text-center font-medium text-gray-900 dark:text-zinc-100">
                    {example.name}
                  </p>
                  <p className="text-center text-sm text-gray-500 dark:text-zinc-500">
                    {example.pack}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="py-12" aria-labelledby="packs-heading">
          <div className="mx-auto max-w-4xl">
            <h2
              id="packs-heading"
              className={`mb-10 text-center ${headingClassName}`}
            >
              Two packs, {PRICE} each
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {packs.map((pack) => (
                <StandardCard key={pack.name} className="gap-4 rounded-2xl p-6">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-xl font-medium text-gray-900 dark:text-zinc-100">
                      {pack.name}
                    </h3>
                    <p className="text-xl font-medium text-gray-900 dark:text-zinc-100">
                      {PRICE}
                    </p>
                  </div>
                  <p className="leading-relaxed text-gray-600 dark:text-zinc-400">
                    {pack.description}
                  </p>
                  <ul className="space-y-2 text-gray-700 dark:text-zinc-300">
                    {pack.details.map((detail) => (
                      <CheckItem key={detail}>{detail}</CheckItem>
                    ))}
                  </ul>
                </StandardCard>
              ))}
            </div>
            <div className="mt-8">
              <h3 className="mb-3 text-center text-lg font-medium text-gray-900 dark:text-zinc-100">
                Every pack includes
              </h3>
              <ul className="mx-auto max-w-xl space-y-2 text-gray-700 dark:text-zinc-300">
                {included.map((item) => (
                  <CheckItem key={item}>{item}</CheckItem>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="py-12" aria-labelledby="how-heading">
          <div className="mx-auto max-w-3xl">
            <h2
              id="how-heading"
              className={`mb-10 text-center ${headingClassName}`}
            >
              How it works
            </h2>
            <ol className="space-y-4">
              {steps.map((step, index) => (
                <li key={step.title}>
                  <StandardCard className="flex-row items-start gap-5 rounded-2xl p-6">
                    <span
                      className="font-serif text-4xl leading-none font-light text-gray-300 dark:text-zinc-500"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="mb-1 text-lg font-medium text-gray-900 dark:text-zinc-100">
                        {step.title}
                      </h3>
                      <p className="leading-relaxed text-gray-600 dark:text-zinc-400">
                        {step.description}
                      </p>
                    </div>
                  </StandardCard>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="py-12" aria-labelledby="refunds-heading">
          <div className="mx-auto max-w-3xl">
            <h2
              id="refunds-heading"
              className={`mb-10 text-center ${headingClassName}`}
            >
              Price and refunds
            </h2>
            <StandardCard className="gap-4 rounded-2xl p-6 leading-relaxed text-gray-700 sm:p-8 dark:text-zinc-300">
              <p>
                Each pack costs {PRICE}, paid once. There&apos;s no
                subscription. Where VAT applies, it&apos;s included in the
                price. In the US, Canada and India, sales tax may be added at
                checkout.
              </p>
              <p>
                Payments are handled by Polar, our merchant of record. Polar
                processes the payment, handles the tax and sends your receipt.
              </p>
              <p>
                Buying needs a free <ProductName /> account, so you can download
                your videos again later. Making and downloading images never
                needs an account.
              </p>
              <p>
                If a video fails or comes out wrong, email{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className={linkClassName}>
                  {CONTACT_EMAIL}
                </a>{' '}
                and we&apos;ll fix it or refund you.
              </p>
              <p>
                Your videos are made as soon as you pay. At checkout,
                you&apos;ll agree to have them delivered right away, so the
                EU&apos;s 14-day right to cancel ends once they&apos;re made.
              </p>
            </StandardCard>
          </div>
        </section>

        <section className="py-12" aria-labelledby="videos-faq-heading">
          <div className="mx-auto max-w-3xl">
            <h2
              id="videos-faq-heading"
              className={`mb-10 text-center ${headingClassName}`}
            >
              Questions about the videos
            </h2>
            <StandardCard className="gap-0 divide-y divide-gray-200 rounded-2xl py-0 dark:divide-white/8">
              {faqs.map((faq) => (
                <div key={faq.question} className="p-6 sm:p-8">
                  <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-zinc-100">
                    {withProductName(faq.question)}
                  </h3>
                  <p className="leading-relaxed text-gray-600 dark:text-zinc-400">
                    {withProductName(faq.answer)}
                  </p>
                </div>
              ))}
            </StandardCard>
          </div>
        </section>

        <section className="py-12 pb-24" aria-labelledby="videos-cta-heading">
          <DarkCard className="mx-auto max-w-3xl items-center gap-0 rounded-3xl px-8 py-14 text-center shadow-2xl md:px-16">
            <h2
              id="videos-cta-heading"
              className="mb-4 font-serif text-4xl font-normal"
            >
              Get your first video free
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-gray-300 dark:text-zinc-400">
              Join the list before videos launch in {VIDEO_LAUNCH_LABEL}.
              We&apos;ll email you once, when they&apos;re ready.
            </p>
            <a
              href="#join"
              className="inline-block rounded-full bg-white px-10 py-4 text-black shadow-lg transition-all hover:scale-105 hover:bg-gray-100 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Join the list
            </a>
          </DarkCard>
        </section>
      </main>
    </>
  )
}
