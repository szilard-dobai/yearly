'use client'

import { Button } from '@/components/ui/button'
import PackVideoPlayer from '@/components/video/PackVideoPlayer'
import SaveVideoButton from '@/components/video/SaveVideoButton'
import Segmented from '@/components/video/Segmented'
import { readStoredDays } from '@/lib/calendar-sync/local'
import { MONTH_NAMES } from '@/lib/constants'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { useResolvedColorScheme } from '@/lib/hooks/useResolvedColorScheme'
import { trackEvent } from '@/lib/tracking'
import type { VideoKind, VideoTheme } from '@/lib/video'
import {
  orderStage,
  type OrderSummary,
  requestVideoUpdate,
  type UpdateRefusal,
} from '@/lib/videos/client'
import { MAX_UPDATES } from '@/lib/videos/period'
import { useVideoOrder } from '@/lib/videos/useVideoOrder'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useAccountCalendarStatus } from './AccountCalendarStatus'

const linkClassName =
  'font-medium text-gray-900 underline underline-offset-2 dark:text-zinc-100'

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

type UpdateState =
  | { step: 'idle' }
  | { step: 'confirm' }
  | { step: 'sending' }
  | { step: 'refused'; reason: UpdateRefusal }

function periodLabel(order: OrderSummary) {
  return order.pack === 'month' && order.month !== null
    ? `${MONTH_NAMES[order.month]} ${order.year}`
    : String(order.year)
}

function refusalMessage(reason: UpdateRefusal) {
  switch (reason) {
    case 'busy':
      return 'Your videos are already being updated. This usually takes under a minute.'
    case 'no-updates-left':
      return `You've used all ${MAX_UPDATES} updates for this pack. To add more trips, get a new pack from your calendar.`
    case 'too-different':
      return 'These trips are too different from your first video. Updates are for adding trips or fixing a country. For a different calendar, get a new pack.'
    default:
      return "We couldn't update your videos. Try again in a moment."
  }
}

export default function VideoOrderCard({
  order: initial,
}: {
  order: OrderSummary
}) {
  const { settings } = useSettings()
  const calendarStatus = useAccountCalendarStatus()
  const { order, timedOut, watch, freshOrder, reload } = useVideoOrder(
    initial.id,
    { initial }
  )
  const current = order ?? initial
  const [kind, setKind] = useState<VideoKind>(
    current.pack === 'month' ? 'month' : 'year'
  )
  const [chosenTheme, setTheme] = useState<VideoTheme | null>(null)
  const siteTheme = useResolvedColorScheme()
  const theme = chosenTheme ?? siteTheme ?? 'dark'
  const [update, setUpdate] = useState<UpdateState>({ step: 'idle' })

  const stage = orderStage(current)
  const working = stage === 'making' || stage === 'confirming'
  const hasVideos = current.videos.length > 0
  const video = hasVideos
    ? (current.videos.find(
        (item) => item.kind === kind && item.theme === theme
      ) ??
      current.videos.find((item) => item.theme === theme) ??
      current.videos[0])
    : null
  const label = periodLabel(current)
  const isMonth = current.pack === 'month'
  const noun = isMonth ? 'video' : 'videos'

  const sendUpdate = async () => {
    setUpdate({ step: 'sending' })
    const result = await requestVideoUpdate(
      current,
      readStoredDays(),
      settings.weekStartsOn
    )
    trackEvent('animated_video_update_requested', {
      pack: current.pack,
      result: result.ok ? 'started' : result.reason,
    })
    if (result.ok) {
      watch(result.order)
      setUpdate({ step: 'idle' })
    } else {
      setUpdate({ step: 'refused', reason: result.reason })
    }
  }

  let status: string | null = null
  if (working) {
    status = timedOut
      ? `This is taking longer than usual. We'll email you when your ${noun} ${isMonth ? 'is' : 'are'} ready.`
      : hasVideos
        ? `Updating your ${noun} with your latest trips. Usually under a minute.`
        : `Making your ${noun}. Usually under a minute.`
  } else if (stage === 'failed') {
    status = hasVideos
      ? "Your update didn't work. We're on it, and we'll email you when it's done."
      : `Something went wrong making your ${noun}. We're on it, and we'll email you when ${isMonth ? "it's" : "they're"} ready.`
  }

  const canUpdate =
    current.updatesLeft > 0 && !working && calendarStatus === 'saved'

  return (
    <article className="space-y-4">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-zinc-100">
            {label}
          </h3>
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            {isMonth ? 'Month pack' : 'Year pack: your year and your stats'}
          </p>
        </div>
        <p className="shrink-0 text-xs text-gray-500 dark:text-zinc-500">
          {DATE_FORMAT.format(new Date(current.createdAt))}
        </p>
      </header>

      {video && (
        <div className="flex gap-4">
          <div className="aspect-9/16 w-28 shrink-0 overflow-hidden rounded-lg ring-1 ring-black/5 sm:w-32 dark:ring-white/8">
            <PackVideoPlayer video={video} onExpired={reload} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
            <div className="flex flex-col items-start gap-2">
              {!isMonth && (
                <Segmented
                  label="Video"
                  value={kind}
                  onChange={setKind}
                  options={[
                    { value: 'year', label: 'Your year' },
                    { value: 'stats', label: 'Your stats' },
                  ]}
                />
              )}
              <Segmented
                label="Theme"
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                ]}
              />
            </div>
            <SaveVideoButton
              order={current}
              video={video}
              freshOrder={freshOrder}
              source="account"
            />
          </div>
        </div>
      )}

      {status && (
        <p
          role="status"
          className="flex items-start gap-2 text-sm text-gray-600 dark:text-zinc-400"
        >
          {working && !timedOut && (
            <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
          )}
          {status}
        </p>
      )}

      {stage !== 'confirming' && (
        <div className="space-y-2 border-t border-gray-200 pt-4 dark:border-white/8">
          {current.updatesLeft === 0 ? (
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              {refusalMessage('no-updates-left')}{' '}
              <Link href="/create" className={linkClassName}>
                Open your calendar
              </Link>
            </p>
          ) : update.step === 'confirm' || update.step === 'sending' ? (
            <div className="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-white/5">
              <p className="text-sm text-gray-700 dark:text-zinc-300">
                Remake your {label} {noun} from the trips in your calendar now?
                This uses 1 of the {current.updatesLeft}{' '}
                {current.updatesLeft === 1 ? 'update' : 'updates'} you have
                left.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={sendUpdate}
                  disabled={update.step === 'sending'}
                >
                  {update.step === 'sending' && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Update {noun}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setUpdate({ step: 'idle' })}
                  disabled={update.step === 'sending'}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                className="w-full whitespace-normal"
                disabled={!canUpdate}
                onClick={() => setUpdate({ step: 'confirm' })}
              >
                Update with my latest trips ({current.updatesLeft} left)
              </Button>
              {calendarStatus === 'loading' && (
                <p className="text-xs text-gray-500 dark:text-zinc-500">
                  Checking your saved trips…
                </p>
              )}
              {calendarStatus === 'error' && (
                <p className="text-xs text-gray-500 dark:text-zinc-500">
                  We couldn&apos;t reach your saved trips. Try again in a
                  moment.
                </p>
              )}
              {update.step === 'refused' && (
                <p
                  role="alert"
                  className="text-sm text-gray-700 dark:text-zinc-300"
                >
                  {refusalMessage(update.reason)}
                  {(update.reason === 'too-different' ||
                    update.reason === 'no-updates-left') && (
                    <>
                      {' '}
                      <Link href="/create" className={linkClassName}>
                        Open your calendar
                      </Link>
                    </>
                  )}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </article>
  )
}
