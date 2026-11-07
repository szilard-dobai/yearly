import Footer from '@/components/Footer'
import { JsonLd } from '@/components/JsonLd'
import { SettingsProvider } from '@/lib/contexts/SettingsContext'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata } from 'next'
import { Geist, Newsreader, Roboto } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const roboto = Roboto({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  style: ['normal', 'italic'],
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

const title = 'Yearly: Your Travel Year in Review, on One Calendar'
const shareDescription =
  'Add the countries you visited and your dates, and flags fill a 12-month calendar you can download and share.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: '%s | Yearly',
  },
  description:
    'Make your travel year in review. Add the countries you visited and your dates, and flags fill a 12-month calendar to download and share. Free, no sign-up.',
  authors: [{ name: 'Yearly' }],
  creator: 'Yearly',
  publisher: 'Yearly',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Yearly',
    title,
    description: shareDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description: shareDescription,
  },
  alternates: {
    canonical: '/',
    types: {
      'text/plain': '/llms.txt',
    },
  },
  appleWebApp: {
    title: 'Yearly',
  },
  category: 'Travel',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <JsonLd type="website" />
      </head>
      <SettingsProvider>
        <body
          className={`min-h-screen bg-linear-to-br from-gray-50 to-stone-50 dark:from-[#0a0a0a] dark:to-[#0a0a0a] ${geistSans.variable} ${roboto.variable} ${newsreader.variable} antialiased`}
        >
          <Analytics />
          <SpeedInsights />
          {children}
          <Footer />
        </body>
      </SettingsProvider>
    </html>
  )
}
