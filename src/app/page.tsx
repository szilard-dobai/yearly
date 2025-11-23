'use client'

import { CalendarMockup } from '@/components/CalendarMockup'
import { YearlyLogo } from '@/components/YearlyLogo'
import { ArrowRight, Calendar, Share2, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-stone-50 via-white to-zinc-50">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <YearlyLogo />
          <Link
            href="/create"
            className="px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
          >
            Try it now
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-6 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1
            className="mb-6 text-gray-900"
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
            className="text-gray-600 mb-12 max-w-2xl mx-auto"
            style={{ fontSize: '1.25rem', lineHeight: '1.7' }}
          >
            A clean, visual summary of your year. Select your days, choose your
            flags, and export a polished, calendar-style snapshot of everywhere
            you travelled.
          </p>

          <div className="flex gap-4 justify-center items-center flex-wrap">
            <Link
              href="/create"
              className="px-8 py-4 bg-black text-white rounded-full hover:bg-gray-800 transition-all hover:scale-105 flex items-center gap-2 shadow-lg"
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <h3
              className="mb-3 text-gray-900"
              style={{ fontSize: '1.25rem', fontWeight: '500' }}
            >
              Clean calendar view
            </h3>
            <p className="text-gray-600" style={{ lineHeight: '1.7' }}>
              Your entire year displayed in a beautiful 3×4 grid—all 12 months
              at once.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center"
          >
            <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h3
              className="mb-3 text-gray-900"
              style={{ fontSize: '1.25rem', fontWeight: '500' }}
            >
              Flags replace dates
            </h3>
            <p className="text-gray-600" style={{ lineHeight: '1.7' }}>
              Country flags automatically appear on your travel dates, turning
              trips into visual stories.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center"
          >
            <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Share2 className="w-7 h-7 text-white" />
            </div>
            <h3
              className="mb-3 text-gray-900"
              style={{ fontSize: '1.25rem', fontWeight: '500' }}
            >
              Share anywhere
            </h3>
            <p className="text-gray-600" style={{ lineHeight: '1.7' }}>
              Export instantly and share your year-in-review on Instagram,
              TikTok, or anywhere else.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-24 bg-linear-to-br from-gray-50 to-stone-50">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 text-gray-900"
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
                title: 'Select your travel dates',
                description:
                  'Click the days you travelled throughout the year.',
              },
              {
                step: '02',
                title: 'Choose country flags',
                description:
                  'Pick the flag for each destination—we will place them on the calendar.',
              },
              {
                step: '03',
                title: 'Export and share',
                description:
                  'Download your Yearly as a high-quality image, ready to post.',
              },
            ].map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="flex gap-6 items-start bg-white p-8 rounded-2xl shadow-sm border border-gray-200"
              >
                <div
                  className="text-gray-300"
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
                    className="mb-2 text-gray-900"
                    style={{ fontSize: '1.25rem', fontWeight: '500' }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-gray-600" style={{ lineHeight: '1.7' }}>
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
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center bg-black text-white rounded-3xl p-16 shadow-2xl"
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
            className="mb-8 text-gray-300"
            style={{ fontSize: '1.125rem', lineHeight: '1.7' }}
          >
            Transform your 2025 travels into a shareable calendar in minutes.
          </p>
          <Link
            href="/create"
            className="px-10 py-4 bg-white text-black rounded-full hover:bg-gray-100 transition-all hover:scale-105 shadow-lg"
          >
            Get started for free
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-gray-200 bg-white">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <YearlyLogo />
            <div className="flex gap-8 text-gray-600">
              <a href="#" className="hover:text-gray-900 transition-colors">
                About
              </a>
              <a href="#" className="hover:text-gray-900 transition-colors">
                Help
              </a>
              <a href="#" className="hover:text-gray-900 transition-colors">
                Contact
              </a>
            </div>
          </div>
          <div className="text-center mt-8 text-gray-500">
            © 2025 Yearly. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
