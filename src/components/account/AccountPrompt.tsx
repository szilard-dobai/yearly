'use client'

import { dismissAccountPrompt } from '@/lib/hooks/useAccountPrompt'
import { trackEvent } from '@/lib/tracking'
import { CloudUpload, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

interface AccountPromptProps {
  days: number
  onSeen?: () => void
}

export default function AccountPrompt({ days, onSeen }: AccountPromptProps) {
  const daysRef = useRef(days)
  const onSeenRef = useRef(onSeen)

  useEffect(() => {
    daysRef.current = days
    onSeenRef.current = onSeen
  })

  useEffect(() => {
    trackEvent('account_prompt_shown', { days: daysRef.current })
    onSeenRef.current?.()
  }, [])

  const dismiss = () => {
    trackEvent('account_prompt_dismissed', { days })
    dismissAccountPrompt()
  }

  return (
    <div
      role="dialog"
      aria-labelledby="account-prompt-title"
      className="pointer-events-auto w-full rounded-xl bg-gray-900 p-4 text-sm text-white shadow-lg sm:max-w-md dark:bg-zinc-100 dark:text-gray-900"
    >
      <div className="flex items-start gap-3">
        <CloudUpload className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          <p id="account-prompt-title" className="font-medium">
            Your trips are only in this browser
          </p>
          <p className="text-white/70 dark:text-gray-600">
            Clearing your browser data deletes them. Save your calendar to a
            free account to keep it and see it on any phone or computer. You can
            keep using Yearly without one.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="-me-1 -mt-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-white/60 transition-colors hover:bg-white/10 hover:text-white dark:text-gray-500 dark:hover:bg-black/8 dark:hover:text-gray-900"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={dismiss}
          className="cursor-pointer rounded-lg px-3 py-1.5 font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white dark:text-gray-600 dark:hover:bg-black/8 dark:hover:text-gray-900"
        >
          Not now
        </button>
        <Link
          href="/sign-in?next=/create"
          onClick={() => trackEvent('account_prompt_click', { days })}
          className="rounded-lg bg-white px-3 py-1.5 font-semibold text-gray-900 transition-colors hover:bg-white/90 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
        >
          Save my calendar
        </Link>
      </div>
    </div>
  )
}
