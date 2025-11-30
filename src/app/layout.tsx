import Footer from '@/components/Footer'
import { SettingsProvider } from '@/lib/contexts/SettingsContext'
import type { Metadata } from 'next'
import { Geist, Newsreader, Roboto } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
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

export const metadata: Metadata = {
  title: 'Yearly',
  description: 'Your year, at a glance',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <SettingsProvider>
        <body
          className={`min-h-screen bg-linear-to-br from-gray-50 to-stone-50 dark:from-gray-950 dark:to-stone-950 ${geistSans.variable} ${roboto.variable} ${newsreader.variable} antialiased`}
        >
          <Analytics />
          {children}
          <Footer />
        </body>
      </SettingsProvider>
    </html>
  )
}
