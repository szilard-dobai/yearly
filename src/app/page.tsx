import { AnimatedSection } from '@/components/AnimatedSection'
import { CalendarMockup } from '@/components/CalendarMockup'
import { Faq } from '@/components/Faq'
import { FeatureIcon } from '@/components/FeatureIcon'
import Header from '@/components/Header'
import { HomepageTracker, TrackingLink } from '@/components/HomepageClient'
import { HomepageExamples } from '@/components/HomepageExamples'
import { HomepageVideoTeaser } from '@/components/HomepageVideoTeaser'
import { ArrowRight, Calendar, Share2, Sparkles } from 'lucide-react'

export const revalidate = 86400

const features = [
  {
    icon: Calendar,
    title: 'All 12 months on one page',
    description:
      'The image shows all 12 months on a 3×4 grid, January to December, so you can see when you traveled as well as where.',
  },
  {
    icon: Sparkles,
    title: 'Flags instead of dates',
    description:
      'Pick a country and your dates, and its flag replaces the number on each of those days.',
  },
  {
    icon: Share2,
    title: 'Three images to share',
    description:
      'Download the full year, a single month sized for stories, or a stats card with your countries and days abroad. Each one is a JPEG.',
  },
]

const steps = [
  {
    step: '01',
    title: 'Pick a country and dates',
    description:
      'Search for a country and choose a day or a date range. Or select the first and last day of a trip on the calendar, then pick the country.',
  },
  {
    step: '02',
    title: 'Add the rest of your trips',
    description:
      'Keep adding countries until every trip is in. Trips save in this browser as you go, so you can come back and add more later.',
  },
  {
    step: '03',
    title: 'Download and share',
    description:
      'Save the full year, one month or your stats as a JPEG. On most phones, the download button opens your share options so you can post it straight away.',
  },
]

export default function Home() {
  return (
    <>
      <HomepageTracker />
      <Header>
        <TrackingLink
          href="/create"
          linkType="header"
          className="px-6 py-2 bg-black dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full hover:bg-gray-800 dark:hover:bg-zinc-200 transition-colors"
        >
          Make your calendar
        </TrackingLink>
      </Header>

      <main className="container mx-auto px-3 py-6">
        <section className="pt-24 pb-16">
          <AnimatedSection
            animation="fadeInUp"
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="mb-6 text-gray-900 dark:text-zinc-100 text-5xl sm:text-7xl font-serif font-normal leading-tight tracking-tight text-balance">
              Your year in travel, on one calendar.
            </h1>

            <p className="text-gray-600 dark:text-zinc-400 mb-12 max-w-2xl mx-auto text-xl leading-relaxed">
              Yearly turns the countries you visited into a calendar, with a
              flag on every day you were there. Download the whole year as an
              image to share. It&apos;s free, and you don&apos;t need an
              account.
            </p>

            <div className="flex gap-4 justify-center items-center flex-wrap">
              <TrackingLink
                href="/create"
                linkType="hero"
                className="px-8 py-4 bg-black dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full hover:bg-gray-800 dark:hover:bg-zinc-200 transition-all hover:scale-105 flex items-center gap-2 shadow-lg"
              >
                Create your Yearly
                <ArrowRight className="w-5 h-5" />
              </TrackingLink>
            </div>
          </AnimatedSection>

          <div className="mt-20">
            <CalendarMockup />
          </div>
        </section>

        <HomepageExamples />

        <HomepageVideoTeaser />

        <section className="py-24" aria-labelledby="features-heading">
          <h2 id="features-heading" className="sr-only">
            What Yearly does
          </h2>
          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {features.map((feature, idx) => (
              <AnimatedSection
                key={feature.title}
                animation="fadeInUpOnViewWithDelay"
                delay={idx * 0.1}
                className="text-center"
              >
                <FeatureIcon
                  icon={<feature.icon className="w-7 h-7 text-white" />}
                />
                <h3 className="mb-3 text-gray-900 dark:text-zinc-100 text-xl font-medium">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </AnimatedSection>
            ))}
          </div>
        </section>

        <section
          className="py-24 bg-linear-to-br from-gray-50 to-stone-50 dark:from-[#0e0e0e] dark:to-[#111111]"
          aria-labelledby="how-it-works-heading"
        >
          <div className="max-w-3xl mx-auto">
            <AnimatedSection animation="fadeInUpOnView">
              <h2
                id="how-it-works-heading"
                className="text-center mb-16 text-gray-900 dark:text-zinc-100 text-4xl font-serif font-normal"
              >
                How to make your travel year in review
              </h2>
            </AnimatedSection>

            <ol className="space-y-8" role="list">
              {steps.map((item, idx) => (
                <AnimatedSection
                  key={item.step}
                  animation="fadeInLeftOnViewWithDelay"
                  delay={idx * 0.1}
                  className="flex gap-6 items-start bg-white dark:bg-[#141414] p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-white/8 list-none"
                >
                  <div
                    className="text-gray-300 dark:text-zinc-400 text-5xl font-serif font-light leading-none"
                    aria-hidden="true"
                  >
                    {item.step}
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-2 text-gray-900 dark:text-zinc-100 text-xl font-medium">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 dark:text-zinc-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </AnimatedSection>
              ))}
            </ol>
          </div>
        </section>

        <section className="py-24" aria-labelledby="cta-heading">
          <AnimatedSection
            animation="fadeInUpOnView"
            className="max-w-3xl mx-auto text-center bg-black text-white dark:bg-[#1a1a1a] dark:text-zinc-100 rounded-3xl p-16 shadow-2xl dark:border dark:border-white/8"
          >
            <h2
              id="cta-heading"
              className="mb-6 text-4xl font-serif font-normal"
            >
              Make your {new Date().getFullYear()} travel calendar
            </h2>
            <p className="mb-8 text-gray-300 dark:text-zinc-400 text-lg leading-relaxed">
              Add your trips, watch the flags fill in, and download your travel
              recap.
            </p>
            <TrackingLink
              href="/create"
              linkType="cta_section"
              className="inline-block px-10 py-4 bg-white text-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-full hover:bg-gray-100 transition-all hover:scale-105 shadow-lg"
            >
              Add your first trip
            </TrackingLink>
          </AnimatedSection>
        </section>

        <Faq />
      </main>
    </>
  )
}
