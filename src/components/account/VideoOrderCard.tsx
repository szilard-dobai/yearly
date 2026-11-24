'use client'

import PackUpdate from '@/components/video/PackUpdate'
import PackVideoPlayer from '@/components/video/PackVideoPlayer'
import SaveVideoButton from '@/components/video/SaveVideoButton'
import Segmented from '@/components/video/Segmented'
import { readStoredDays } from '@/lib/calendar-sync/local'
import { useResolvedColorScheme } from '@/lib/hooks/useResolvedColorScheme'
import type { VideoKind, VideoTheme } from '@/lib/video'
import {
  orderPeriodLabel,
  orderStage,
  type OrderSummary,
} from '@/lib/videos/client'
import { useVideoOrder } from '@/lib/videos/useVideoOrder'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useAccountCalendarStatus } from './AccountCalendarStatus'

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export default function VideoOrderCard({
  order: initial,
}: {
  order: OrderSummary
}) {
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
  const label = orderPeriodLabel(current)
  const isMonth = current.pack === 'month'
  const noun = isMonth ? 'video' : 'videos'

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
        <div className="border-t border-gray-200 pt-4 dark:border-white/8">
          <PackUpdate
            order={current}
            calendar={calendarStatus}
            readDays={readStoredDays}
            onStarted={watch}
            source="account"
          />
        </div>
      )}
    </article>
  )
}
