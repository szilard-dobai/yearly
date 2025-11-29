'use client'

import { CalendarMockup } from '@/components/CalendarMockup'
import { FeatureIcon } from '@/components/FeatureIcon'
import ThemeToggle from '@/components/ThemeToggle'
import { YearlyLogo } from '@/components/YearlyLogo'
import { SettingsProvider } from '@/lib/contexts/SettingsContext'
import {
  fadeInUp,
  fadeInUpOnView,
  fadeInUpOnViewWithDelay,
  fadeInLeftOnViewWithDelay,
} from '@/lib/animations'
import { ArrowRight, Calendar, Share2, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import Link from 'next/link'

function HomeContent() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-stone-50 dark:from-gray-950 dark:to-stone-950">
      <header className="border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-black/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <YearlyLogo />
          <Link
            href="/create"
            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            Try it now
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-6 pt-24 pb-16">
        <motion.div {...fadeInUp} className="text-center max-w-4xl mx-auto">
          <h1
            className="mb-6 text-gray-900 dark:text-white"
            style={{
              fontSize: '4.5rem',
              fontFamily: 'Newsreader, serif',
              fontWeight: '400',
              lineHeight: '1.1',
              letterSpacing: '-0.02em',
            }}
          >
            Your year, at a glance.
          </h1>

          <p
            className="text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto"
            style={{ fontSize: '1.25rem', lineHeight: '1.7' }}
          >
            A clean, visual summary of your year. Add your countries and travel
            dates, and export a polished, calendar-style snapshot of everywhere
            you travelled.
          </p>

          <div className="flex gap-4 justify-center items-center flex-wrap">
            <Link
              href="/create"
              className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-all hover:scale-105 flex items-center gap-2 shadow-lg"
            >
              Create your Yearly
              <ArrowRight className="w-5 h-5" />
            </Link>
            {/* <button className="px-8 py-4 bg-white text-gray-700 rounded-full hover:bg-gray-50 transition-all border border-gray-300">
              See example
            </button> */}
          </div>
        </motion.div>

        <div className="mt-20">
          <CalendarMockup />
        </div>
      </section>

      <section className="container mx-auto px-6 py-24">
        <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          <motion.div {...fadeInUpOnView} className="text-center">
            <FeatureIcon icon={<Calendar className="w-7 h-7 text-white" />} />
            <h3
              className="mb-3 text-gray-900 dark:text-white"
              style={{ fontSize: '1.25rem', fontWeight: '500' }}
            >
              Clean calendar view
            </h3>
            <p
              className="text-gray-600 dark:text-gray-400"
              style={{ lineHeight: '1.7' }}
            >
              Your entire year displayed in a beautiful 3×4 grid—all 12 months
              at once.
            </p>
          </motion.div>

          <motion.div {...fadeInUpOnViewWithDelay(0.1)} className="text-center">
            <FeatureIcon icon={<Sparkles className="w-7 h-7 text-white" />} />
            <h3
              className="mb-3 text-gray-900 dark:text-white"
              style={{ fontSize: '1.25rem', fontWeight: '500' }}
            >
              Flags replace dates
            </h3>
            <p
              className="text-gray-600 dark:text-gray-400"
              style={{ lineHeight: '1.7' }}
            >
              Country flags automatically appear on your dates when you add
              visits, turning your trips into visual stories.
            </p>
          </motion.div>

          <motion.div {...fadeInUpOnViewWithDelay(0.2)} className="text-center">
            <FeatureIcon icon={<Share2 className="w-7 h-7 text-white" />} />
            <h3
              className="mb-3 text-gray-900 dark:text-white"
              style={{ fontSize: '1.25rem', fontWeight: '500' }}
            >
              Share anywhere
            </h3>
            <p
              className="text-gray-600 dark:text-gray-400"
              style={{ lineHeight: '1.7' }}
            >
              Download your calendar as a high-quality image and share your
              year-in-review on Instagram, TikTok, or anywhere else.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-24 bg-linear-to-br from-gray-50 to-stone-50 dark:from-gray-950 dark:to-stone-950">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            {...fadeInUpOnView}
            className="text-center mb-16 text-gray-900 dark:text-white"
            style={{
              fontSize: '2.5rem',
              fontFamily: 'Newsreader, serif',
              fontWeight: '400',
            }}
          >
            Build it in seconds
          </motion.h2>

          <div className="space-y-8">
            {[
              {
                step: '01',
                title: 'Select a country and dates',
                description:
                  'Choose a country from the dropdown, then pick a date or date range for your visit.',
              },
              {
                step: '02',
                title: 'Add all your trips',
                description:
                  'Keep adding countries and dates. Flags automatically appear on your calendar as you go.',
              },
              {
                step: '03',
                title: 'Export and share',
                description:
                  'Download your Yearly as a high-quality JPEG image, ready to post anywhere.',
              },
            ].map((item, idx) => (
              <motion.div
                key={item.step}
                {...fadeInLeftOnViewWithDelay(idx * 0.1)}
                className="flex gap-6 items-start bg-white dark:bg-neutral-950 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-white/10"
              >
                <div
                  className="text-gray-300 dark:text-gray-400"
                  style={{
                    fontSize: '3rem',
                    fontFamily: 'Newsreader, serif',
                    fontWeight: '300',
                    lineHeight: '1',
                  }}
                >
                  {item.step}
                </div>
                <div className="flex-1">
                  <h3
                    className="mb-2 text-gray-900 dark:text-white"
                    style={{ fontSize: '1.25rem', fontWeight: '500' }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-gray-600 dark:text-gray-400"
                    style={{ lineHeight: '1.7' }}
                  >
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-24">
        <motion.div
          {...fadeInUpOnView}
          className="max-w-3xl mx-auto text-center bg-black text-white dark:bg-white dark:text-black rounded-3xl p-16 shadow-2xl"
        >
          <h2
            className="mb-6"
            style={{
              fontSize: '2.5rem',
              fontFamily: 'Newsreader, serif',
              fontWeight: '400',
            }}
          >
            Ready to create yours?
          </h2>
          <p
            className="mb-8 text-gray-300 dark:text-gray-700"
            style={{ fontSize: '1.125rem', lineHeight: '1.7' }}
          >
            Transform your 2025 travels into a shareable calendar in minutes.
          </p>
          <Link
            href="/create"
            className="px-10 py-4 bg-white text-black dark:bg-black dark:text-white dark:hover:bg-gray-900 rounded-full hover:bg-gray-100 transition-all hover:scale-105 shadow-lg"
          >
            Get started for free
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-gray-200 dark:border-white/10 bg-white dark:bg-black">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <YearlyLogo />
            <div className="flex gap-8 text-gray-600 dark:text-gray-400 items-center">
              <a
                href="#"
                className="hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                About
              </a>
              <a
                href="#"
                className="hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Help
              </a>
              <a
                href="#"
                className="hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Contact
              </a>
              <ThemeToggle />
            </div>
          </div>
          <div className="text-center mt-8 text-gray-500 dark:text-gray-400">
            © 2025 Yearly. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function Home() {
  return (
    <SettingsProvider>
      <HomeContent />
    </SettingsProvider>
  )
}
