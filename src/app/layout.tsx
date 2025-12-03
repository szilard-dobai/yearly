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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Yearly - Visualize Your Travel Year in a Beautiful Calendar',
    template: '%s | Yearly',
  },
  description:
    'Create a stunning visual calendar of your travels. Add countries and dates, see flags replace days, and export a shareable image of your year in review. Free travel calendar maker.',
  keywords: [
    'travel calendar',
    'year in review',
    'travel tracker',
    'countries visited',
    'travel visualization',
    'trip planner',
    'travel journal',
    'yearly travel summary',
    'travel map',
    'country flags calendar',
    'travel memories',
    'wanderlust',
    'digital nomad',
    'travel recap',
    'annual travel summary',
  ],
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
    title: 'Yearly - Visualize Your Travel Year in a Beautiful Calendar',
    description:
      'Create a stunning visual calendar of your travels. Add countries and dates, see flags replace days, and export a shareable image of your year in review.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Yearly - Visualize Your Travel Year in a Beautiful Calendar',
    description:
      'Create a stunning visual calendar of your travels. Add countries and dates, see flags replace days, and export a shareable image.',
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48', rel: 'shortcut icon' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: {
    title: 'Yearly',
  },
  manifest: '/site.webmanifest',
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
          className={`min-h-screen bg-linear-to-br from-gray-50 to-stone-50 dark:from-gray-950 dark:to-stone-950 ${geistSans.variable} ${roboto.variable} ${newsreader.variable} antialiased`}
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
