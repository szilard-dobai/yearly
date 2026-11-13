'use client'

import { Button } from '@/components/ui/button'
import { StandardCard } from '@/components/ui/card-variants'
import { dismissAccountPrompt } from '@/lib/hooks/useAccountPrompt'
import { trackEvent } from '@/lib/tracking'
import { CloudUpload } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

export default function AccountPromptCard({ days }: { days: number }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const seenRef = useRef(false)
  const daysRef = useRef(days)

  useEffect(() => {
    daysRef.current = days
  })

  useEffect(() => {
    const card = cardRef.current
    if (!card || seenRef.current) return

    const markSeen = () => {
      seenRef.current = true
      trackEvent('account_prompt_shown', { days: daysRef.current })
    }

    if (typeof IntersectionObserver === 'undefined') {
      markSeen()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        markSeen()
      },
      { threshold: 0.5 }
    )
    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  return (
    <StandardCard ref={cardRef} className="gap-0 px-6 py-5">
      <div className="flex items-start gap-3">
        <CloudUpload className="mt-0.5 size-5 shrink-0 text-gray-900 dark:text-zinc-100" />
        <div className="space-y-2">
          <p className="font-medium text-gray-900 dark:text-zinc-100">
            Your trips are only in this browser
          </p>
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            If you clear your browser data, they&apos;re gone. Save your
            calendar to a free account to keep it and see it on any phone or
            computer.
          </p>
          <p className="text-sm text-gray-500 dark:text-zinc-500">
            You can keep using Yearly without one.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button asChild size="sm">
              <Link
                href="/sign-in?next=/create"
                onClick={() => trackEvent('account_prompt_click', { days })}
              >
                Save my calendar
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                trackEvent('account_prompt_dismissed', { days })
                dismissAccountPrompt()
              }}
            >
              Not now
            </Button>
          </div>
        </div>
      </div>
    </StandardCard>
  )
}
