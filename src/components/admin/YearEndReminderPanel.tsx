'use client'

import CopyButton from '@/components/admin/CopyButton'
import Metric from '@/components/admin/Metric'
import EmailSendActions, {
  describeRun,
  type EmailSendCopy,
} from '@/components/admin/EmailSendActions'
import {
  getReminderSendWindowLabel,
  REMINDER_DATE_LABEL,
} from '@/lib/reminders/date'
import type { ReminderStats } from '@/lib/reminders/stats'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

const SEND_COPY: EmailSendCopy = {
  testUrl: '/api/reminders/test-email',
  testTitle: 'Send a test reminder',
  testDescription:
    "Sends this year's reminder email to the address below. It isn't saved, and no reminder is marked as sent.",
  runUrl: '/api/reminders/send',
  runLabel: 'Run now',
  runTitle: 'Send the reminders now?',
  runDescription:
    "Emails everyone who hasn't had their reminder yet, for up to 40 seconds. Run it again if some are left. Nobody gets two, even if the cron runs at the same time.",
}

type Result =
  | { key: string; stats: ReminderStats; failed: false }
  | { key: string; stats: null; failed: true }

export default function YearEndReminderPanel({
  refreshKey,
}: {
  refreshKey: number
}) {
  const [result, setResult] = useState<Result | null>(null)
  const [reloads, setReloads] = useState(0)
  const [lastRun, setLastRun] = useState<string | null>(null)
  const loadKey = `${refreshKey}:${reloads}`

  useEffect(() => {
    let cancelled = false
    const key = `${refreshKey}:${reloads}`
    fetch('/api/reminders/stats')
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.json() as Promise<ReminderStats>
      })
      .then((stats) => {
        if (!cancelled) setResult({ key, stats, failed: false })
      })
      .catch(() => {
        if (!cancelled) setResult({ key, stats: null, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey, reloads])

  const stats = result?.stats
  const isRefreshing = !!result && result.key !== loadKey

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
        <div className={cn('transition-opacity', isRefreshing && 'opacity-40')}>
          <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <Metric
              label="Email sign-ups"
              value={stats.total}
              hint={`${stats.lastSevenDays.toLocaleString()} in the last 7 days`}
            />
            <Metric label="Apple / Outlook" value={stats.calendarAdds.ics} />
            <Metric label="Google Calendar" value={stats.calendarAdds.google} />
            <Metric label="Cards shown" value={stats.shown} />
          </dl>

          <div className="mt-6 border-t border-gray-200 pt-4 dark:border-white/8">
            <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100">
              Sending
            </h3>
            <p className="mb-4 text-xs text-gray-500 dark:text-zinc-400">
              The cron sends from {getReminderSendWindowLabel()}. Each address
              gets one email
            </p>
            <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
              <Metric label="Sent" value={stats.send.sent} />
              <Metric
                label="Failed"
                value={stats.send.failed}
                hint={
                  stats.send.needsCheck > 0
                    ? `${stats.send.needsCheck.toLocaleString()} won't be retried; check Resend's logs`
                    : undefined
                }
              />
              <Metric label="Left" value={stats.send.left} />
            </dl>
            <div className="mt-4">
              <EmailSendActions
                copy={SEND_COPY}
                blocked={stats.send.blocked}
                onRunFinished={(run) => {
                  setLastRun(describeRun(run))
                  setReloads((count) => count + 1)
                }}
              />
            </div>
          </div>
        </div>
      )}
      {lastRun && (
        <p
          role="status"
          className="mt-3 text-xs text-gray-600 dark:text-zinc-300"
        >
          Last run: {lastRun}
        </p>
      )}
    </section>
  )
}
