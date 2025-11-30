import ThemeToggle from '@/components/ThemeToggle'
import { SettingsProvider } from '@/lib/contexts/SettingsContext'
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
          {children}

          <footer className="border-t border-gray-200 dark:border-white/10 bg-white dark:bg-black mx-auto px-3 py-8 space-y-4">
            <div className="container mx-auto flex justify-between items-center">
              <p className="m-0 text-sm font-mono text-muted-foreground">
                Built by{' '}
                <a
                  href="https://www.linkedin.com/in/szilard-dobai/"
                  target="blank"
                  className="hover:opacity-80 transition-opacity underline"
                >
                  Szilard Dobai
                </a>
              </p>

              <ThemeToggle />
            </div>
          </footer>
        </body>
      </SettingsProvider>
    </html>
  )
}
