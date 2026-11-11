'use client'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  buildGoogleCalendarUrl,
  downloadReminderIcs,
  shouldOfferYearEndReminder,
} from '@/lib/reminders/calendar'
import {
  createYearEndReminder,
  recordCalendarReminder,
} from '@/lib/reminders/client'
import { REMINDER_DATE_LABEL } from '@/lib/reminders/date'
import { getSavedReminder, saveReminder } from '@/lib/reminders/storage'
import type { CalendarProvider, ReminderMethod } from '@/lib/reminders/types'
import { trackEvent } from '@/lib/tracking'
import { cn } from '@/lib/utils'
import { BellRing, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { type FormEvent, useEffect, useId, useState } from 'react'

const OPTION_CLASSES =
  'h-auto min-h-8 whitespace-normal border-gray-200 bg-white px-2 py-1.5 text-gray-900 hover:bg-gray-50 dark:border-white/8 dark:bg-[#1a1a1a] dark:text-zinc-100 dark:hover:bg-[#222222]'

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
}

export default function YearEndReminderCard({ year }: { year: number }) {
  const [now] = useState(() => new Date())
  const [saved, setSaved] = useState<ReminderMethod | null>(() =>
    getSavedReminder(year)
  )
  const [retrying, setRetrying] = useState(false)
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const emailId = useId()
  const calendarLabelId = useId()
  const offered = shouldOfferYearEndReminder(year, now)

  useEffect(() => {
    if (offered && !saved) trackEvent('year_end_reminder_shown', { year })
  }, [offered, saved, year])

  if (!offered) return null

  const markSet = (method: ReminderMethod) => {
    saveReminder(year, method)
    setSaved(method)
    setRetrying(false)
  }

  const trackCalendarAdd = (provider: CalendarProvider) => {
    trackEvent('year_end_reminder_calendar_add', { provider, year })
    recordCalendarReminder({ year, provider })
  }

  const handleIcs = () => {
    trackCalendarAdd('ics')
    downloadReminderIcs(year, getSiteUrl())
    markSet('ics')
  }

  const handleGoogle = () => {
    trackCalendarAdd('google')
    // Unmounting the link during its own click can cancel the navigation
    setTimeout(() => markSet('google'))
  }

  const handleEmail = async (event: FormEvent) => {
    event.preventDefault()
    setIsSending(true)
    setError(null)
    try {
      await createYearEndReminder({ email, year })
      markSet('email')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSending(false)
    }
  }

  if (saved && !retrying) {
    return (
      <div
        role="status"
        className="mb-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-white/8 dark:bg-white/5"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Check className="size-4" />
        </span>
        <p className="min-w-0 flex-1 text-sm text-gray-600 dark:text-zinc-400">
          <span className="font-medium text-gray-900 dark:text-zinc-100">
            Reminder set
          </span>{' '}
          {saved === 'email'
            ? `We'll email you on ${REMINDER_DATE_LABEL}.`
            : `for ${REMINDER_DATE_LABEL} in your calendar.`}
        </p>
        {saved !== 'email' && (
          <button
            type="button"
            onClick={() => setRetrying(true)}
            className="shrink-0 cursor-pointer text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-100"
          >
            Didn&apos;t work?
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="@container mb-4 rounded-lg border border-gray-200 bg-white p-3 dark:border-white/8 dark:bg-white/5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-900 dark:bg-white/8 dark:text-zinc-100">
          <BellRing className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
            More trips before New Year?
          </p>
          <p className="text-xs text-gray-600 dark:text-zinc-400">
            We&apos;ll remind you on {REMINDER_DATE_LABEL}, when{' '}
            <span className="whitespace-nowrap">year-in-review</span> season
            starts, to add them and share your {year}.
          </p>
        </div>
      </div>

      <form onSubmit={handleEmail} className="mt-3">
        <label htmlFor={emailId} className="sr-only">
          Email for your reminder
        </label>
        <div className="flex flex-col gap-2 @min-[14rem]:flex-row">
          <Input
            id={emailId}
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error || undefined}
            className="bg-white dark:bg-[#141414]"
          />
          <Button type="submit" disabled={isSending}>
            {isSending && <Loader2 className="size-4 animate-spin" />}
            Remind me
          </Button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-zinc-500">
          We&apos;ll email you once, on {REMINDER_DATE_LABEL}. Nothing else.{' '}
          <Link
            href="/privacy"
            target="_blank"
            className="underline underline-offset-2 hover:text-gray-900 dark:hover:text-zinc-100"
          >
            Privacy
          </Link>
        </p>
        {error && (
          <p
            role="alert"
            className="mt-1 text-xs text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}
      </form>

      <div
        role="group"
        aria-labelledby={calendarLabelId}
        className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-gray-200 pt-3 dark:border-white/8"
      >
        <p
          id={calendarLabelId}
          className="text-xs text-gray-600 dark:text-zinc-400"
        >
          Or add it to your calendar
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={OPTION_CLASSES}
            onClick={handleIcs}
          >
            Apple / Outlook
          </Button>
          <a
            href={buildGoogleCalendarUrl(year, getSiteUrl())}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleGoogle}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              OPTION_CLASSES
            )}
          >
            Google
          </a>
        </div>
      </div>
    </div>
  )
}
