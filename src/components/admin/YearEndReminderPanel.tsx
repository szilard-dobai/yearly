'use client'

import CopyButton from '@/components/admin/CopyButton'
import { REMINDER_DATE_LABEL } from '@/lib/reminders/date'
import type { ReminderStats } from '@/lib/reminders/stats'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

type Result =
  | { key: number; stats: ReminderStats; failed: false }
  | { key: number; stats: null; failed: true }

function Metric({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint?: string
}) {
  return (
    <div>
      <dt className="text-sm text-gray-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums dark:text-zinc-100">
        {value.toLocaleString()}
      </dd>
      {hint && (
        <dd className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
          {hint}
        </dd>
      )}
    </div>
  )
}

export default function YearEndReminderPanel({
  refreshKey,
}: {
  refreshKey: number
}) {
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/reminders/stats')
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.json() as Promise<ReminderStats>
      })
      .then((stats) => {
        if (!cancelled) setResult({ key: refreshKey, stats, failed: false })
      })
      .catch(() => {
        if (!cancelled)
          setResult({ key: refreshKey, stats: null, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const stats = result?.stats
  const isRefreshing = !!result && result.key !== refreshKey

  return (
    <section
      aria-labelledby="year-end-reminders-heading"
      aria-busy={!result || isRefreshing}
      className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/8 dark:bg-[#141414]"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2
            id="year-end-reminders-heading"
            className="text-sm font-medium text-gray-900 dark:text-zinc-100"
          >
            Year-end reminders
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            {stats && `For ${REMINDER_DATE_LABEL} ${stats.year}. `}Calendar adds
            and cards shown count unique devices
          </p>
        </div>
        {stats && stats.emails.length > 0 && (
          <CopyButton
            value={stats.emails.join('\n')}
            label={`Copy ${stats.emails.length.toLocaleString()} emails, one per line`}
          >
            Copy emails
          </CopyButton>
        )}
      </div>

      {!result || (result.failed && isRefreshing) ? (
        <Loader2 className="size-5 animate-spin text-gray-400" />
      ) : !stats ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load the reminder stats.
        </p>
      ) : (
        <dl
          className={cn(
            'grid grid-cols-2 gap-6 transition-opacity md:grid-cols-4',
            isRefreshing && 'opacity-40'
          )}
        >
          <Metric
            label="Email sign-ups"
            value={stats.total}
            hint={`${stats.lastSevenDays.toLocaleString()} in the last 7 days`}
          />
          <Metric label="Apple / Outlook" value={stats.calendarAdds.ics} />
          <Metric label="Google Calendar" value={stats.calendarAdds.google} />
          <Metric label="Cards shown" value={stats.shown} />
        </dl>
      )}
    </section>
  )
}
