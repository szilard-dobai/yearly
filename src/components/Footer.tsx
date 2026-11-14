import { isAccountsEnabled } from '@/lib/auth/enabled'
import Link from 'next/link'
import ThemeToggle from './ThemeToggle'

export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 dark:border-white/8 bg-white dark:bg-[#0a0a0a] mx-auto px-3 py-8 space-y-4">
      <div className="container mx-auto flex justify-between items-center">
        <p className="m-0 text-sm font-mono text-muted-foreground">
          <a
            href="https://www.instagram.com/yearly.world"
            target="_blank"
            className="hover:opacity-80 transition-opacity underline"
          >
            @yearly.world
          </a>
          {' · '}
          <Link
            href="/privacy"
            className="hover:opacity-80 transition-opacity underline"
          >
            Privacy
          </Link>
          {isAccountsEnabled() && (
            <>
              {' · '}
              <Link
                href="/terms"
                className="hover:opacity-80 transition-opacity underline"
              >
                Terms
              </Link>
            </>
          )}
        </p>

        <ThemeToggle />
      </div>
      <p className="container mx-auto m-0 text-xs text-muted-foreground">
        Flag and emoji images from{' '}
        <a
          href="https://github.com/googlefonts/noto-emoji"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity underline"
        >
          Noto Emoji
        </a>
        , under the{' '}
        <a
          href="/emoji/LICENSE"
          className="hover:opacity-80 transition-opacity underline"
        >
          Apache License 2.0
        </a>
        .
      </p>
    </footer>
  )
}
