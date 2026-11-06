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
import { BellRing, Check, ChevronDown, Loader2 } from 'lucide-react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { type FormEvent, useId, useState } from 'react'

const OPTION_CLASSES =
  'h-auto min-h-8 whitespace-normal border-gray-200 bg-white px-2 py-1.5 text-gray-900 hover:bg-gray-50 dark:border-white/8 dark:bg-[#1a1a1a] dark:text-zinc-100 dark:hover:bg-[#222222]'

const LABEL_CLASSES =
  'mb-1.5 block text-xs font-medium text-gray-900 dark:text-zinc-100'

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
}

export default function YearEndReminderCard({ year }: { year: number }) {
  const [now] = useState(() => new Date())
  const [saved, setSaved] = useState<ReminderMethod | null>(() =>
    getSavedReminder(year)
  )
  const [expanded, setExpanded] = useState(false)
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panelId = useId()
  const emailId = useId()
  const calendarLabelId = useId()

  if (!shouldOfferYearEndReminder(year, now)) return null

  const markSet = (method: ReminderMethod) => {
    saveReminder(year, method)
    setSaved(method)
    setExpanded(false)
  }

  const toggle = () => {
    if (!expanded && !saved) trackEvent('year_end_reminder_open', { year })
    setExpanded(!expanded)
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

  if (saved && !expanded) {
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
            onClick={() => setExpanded(true)}
            className="shrink-0 cursor-pointer text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-100"
          >
            Didn&apos;t work?
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white dark:border-white/8 dark:bg-white/5">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={toggle}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/8',
          expanded && 'rounded-b-none'
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-900 dark:bg-white/8 dark:text-zinc-100">
          <BellRing className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-gray-900 dark:text-zinc-100">
            Your {year} isn&apos;t over yet
          </span>
          <span className="block text-xs text-gray-600 dark:text-zinc-400">
            Get a reminder on {REMINDER_DATE_LABEL} for{' '}
            <span className="whitespace-nowrap">year-in-review</span> season.
          </span>
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-gray-400 transition-transform dark:text-zinc-500',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded && (
        <motion.div
          id={panelId}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="@container space-y-3 border-t border-gray-200 p-3 dark:border-white/8"
        >
          <div role="group" aria-labelledby={calendarLabelId}>
            <p id={calendarLabelId} className={LABEL_CLASSES}>
              Add to your calendar
            </p>
            <div className="grid gap-2 @min-[14rem]:grid-cols-2">
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

          <form onSubmit={handleEmail}>
            <label htmlFor={emailId} className={LABEL_CLASSES}>
              Or email me
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
        </motion.div>
      )}
    </div>
  )
}
