'use client'

import { cn } from '@/lib/utils'
import { BarChart3, MessageSquareText } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ADMIN_LINKS = [
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/feedback', label: 'Feedback', icon: MessageSquareText },
] as const

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Admin sections"
      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/8 bg-white dark:bg-[#141414] p-1"
    >
      {ADMIN_LINKS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-gray-900 text-white dark:bg-zinc-100 dark:text-gray-900'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-[#222222] dark:hover:text-zinc-100'
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
