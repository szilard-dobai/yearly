'use client'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth/client'
import { getInitials } from '@/lib/auth/initials'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AccountMenu() {
  const pathname = usePathname()
  const { data, isPending } = authClient.useSession()

  if (pathname === '/sign-in') return null
  if (isPending) return <span aria-hidden className="size-9" />

  if (!data) {
    return (
      <Button asChild variant="ghost" className="px-3">
        <Link href={`/sign-in?next=${encodeURIComponent(pathname)}`}>
          Sign in
        </Link>
      </Button>
    )
  }

  const { name, email } = data.user
  const initials = getInitials(name, email)

  return (
    <Link
      href="/account"
      aria-label="Your account"
      title={name ? `${name} (${email})` : email}
      className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-900 font-medium text-white transition-opacity hover:opacity-80 dark:bg-zinc-100 dark:text-zinc-900 ${initials.length > 1 ? 'text-xs' : 'text-sm'}`}
    >
      {initials}
    </Link>
  )
}
