'use client'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAccountsEnabled } from './AccountsEnabledProvider'

function AccountLink() {
  const pathname = usePathname()
  const { data, isPending } = authClient.useSession()

  if (pathname === '/sign-in') return null
  if (isPending) return <span aria-hidden className="size-8" />

  if (!data) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link href={`/sign-in?next=${encodeURIComponent(pathname)}`}>
          Sign in
        </Link>
      </Button>
    )
  }

  return (
    <Link
      href="/account"
      aria-label="Your account"
      title={data.user.email}
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-medium text-white transition-opacity hover:opacity-80 dark:bg-zinc-100 dark:text-zinc-900"
    >
      {data.user.email.charAt(0).toUpperCase()}
    </Link>
  )
}

export default function AccountMenu() {
  return useAccountsEnabled() ? <AccountLink /> : null
}
