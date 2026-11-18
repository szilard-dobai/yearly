'use client'

import EmailSendActions, {
  describeRun,
  type EmailSendCopy,
} from '@/components/admin/EmailSendActions'
import Metric from '@/components/admin/Metric'
import { cn } from '@/lib/utils'
import type { LaunchSendStatus } from '@/lib/waitlist/launch-send'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

const SEND_COPY: EmailSendCopy = {
  testUrl: '/api/waitlist/launch-email/test',
  testTitle: 'Send a test launch email',
  testDescription:
    "Sends the launch email to the address below. It isn't saved, and nobody on the waitlist is marked as sent.",
  runUrl: '/api/waitlist/launch-email',
  runLabel: 'Run now',
  runTitle: 'Send the launch email now?',
  runDescription:
    "Emails everyone on the video waitlist who hasn't had it yet, for up to 40 seconds. Run it again if some are left. Nobody gets two. Import the free video credits first.",
}

type Result =
  | { key: string; status: LaunchSendStatus; failed: false }
  | { key: string; status: null; failed: true }

export default function VideoLaunchEmailPanel({
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
    fetch('/api/waitlist/launch-email')
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.json() as Promise<LaunchSendStatus>
      })
      .then((status) => {
        if (!cancelled) setResult({ key, status, failed: false })
      })
      .catch(() => {
        if (!cancelled) setResult({ key, status: null, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey, reloads])

  const status = result?.status
  const isRefreshing = !!result && result.key !== loadKey

  return (
    <section
      aria-labelledby="video-launch-email-heading"
      aria-busy={!result || isRefreshing}
      className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/8 dark:bg-[#141414]"
    >
      <h2
        id="video-launch-email-heading"
        className="text-sm font-medium text-gray-900 dark:text-zinc-100"
      >
        Video launch email
      </h2>
      <p className="mb-4 text-xs text-gray-500 dark:text-zinc-400">
        One email to the video waitlist
        {status && `, with the first video free until ${status.freeUntil}`}
      </p>

      {!result || (result.failed && isRefreshing) ? (
        <Loader2 className="size-5 animate-spin text-gray-400" />
      ) : !status ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load the launch email status.
        </p>
      ) : (
        <div className={cn('transition-opacity', isRefreshing && 'opacity-40')}>
          <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <Metric label="On the waitlist" value={status.total} />
            <Metric label="Sent" value={status.sent} />
            <Metric
              label="Failed"
              value={status.failed}
              hint={
                status.needsCheck > 0
                  ? `${status.needsCheck.toLocaleString()} won't be retried; check Resend's logs`
                  : undefined
              }
            />
            <Metric label="Left" value={status.left} />
          </dl>
          <div className="mt-4">
            <EmailSendActions
              copy={SEND_COPY}
              blocked={status.blocked}
              onRunFinished={(run) => {
                setLastRun(describeRun(run))
                setReloads((count) => count + 1)
              }}
            />
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
