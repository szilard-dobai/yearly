'use client'

import CopyButton from '@/components/admin/CopyButton'
import DetailRow from '@/components/admin/DetailRow'
import DeviceTypeIcon from '@/components/admin/DeviceTypeIcon'
import EventTypeBadge, { EventToneDot } from '@/components/admin/EventTypeBadge'
import StarRating, { RATING_LABELS } from '@/components/StarRating'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  formatDateTime,
  formatLocation,
  formatRelativeTime,
  summarizeMetadata,
} from '@/lib/admin/format'
import {
  FEEDBACK_SOURCE_LABELS,
  type FeedbackEntry,
} from '@/lib/feedback/types'
import type { DeviceSummary, StoredTrackingEvent } from '@/lib/tracking/types'
import { cn } from '@/lib/utils'
import { ExternalLink, Loader2, MessageSquareText } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

const EVENT_PAGE_SIZE = 100

interface DeviceActivityResponse {
  deviceId: string
  summary: DeviceSummary | null
  events: StoredTrackingEvent[]
  hasMore: boolean
  feedback: FeedbackEntry[] | null
}

type TimelineItem =
  | { kind: 'event'; at: string; event: StoredTrackingEvent }
  | { kind: 'feedback'; at: string; feedback: FeedbackEntry }

interface DeviceActivityDialogProps {
  feedback: FeedbackEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUnauthorized: () => void
}

function formatContext(entry: FeedbackEntry) {
  const parts = [FEEDBACK_SOURCE_LABELS[entry.source]]
  if (entry.context?.exportType) parts.push(entry.context.exportType)
  if (entry.context?.year) parts.push(String(entry.context.year))
  return parts.join(' · ')
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-[#1a1a1a] px-3 py-2">
      <p className="text-xs text-gray-500 dark:text-zinc-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate">
        {value}
      </p>
    </div>
  )
}

function DeviceActivityContent({
  feedback,
  onUnauthorized,
}: {
  feedback: FeedbackEntry
  onUnauthorized: () => void
}) {
  const [data, setData] = useState<DeviceActivityResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState<number | null>(null)

  const fetchPage = useCallback(
    async (offset: number) => {
      const params = new URLSearchParams({
        limit: String(EVENT_PAGE_SIZE),
        offset: String(offset),
      })
      const response = await fetch(
        `/api/admin/devices/${encodeURIComponent(feedback.deviceId)}?${params}`
      )
      if (response.status === 401) {
        onUnauthorized()
        return null
      }
      if (!response.ok) throw new Error('Failed to load device activity')
      return (await response.json()) as DeviceActivityResponse
    },
    [feedback.deviceId, onUnauthorized]
  )

  useEffect(() => {
    let cancelled = false
    fetchPage(0)
      .then((page) => {
        if (cancelled || !page) return
        setData(page)
        setNow(Date.now())
      })
      .catch((fetchError: Error) => {
        if (!cancelled) setError(fetchError.message)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchPage])

  const loadMore = async () => {
    if (!data) return
    setIsLoadingMore(true)
    try {
      const page = await fetchPage(data.events.length)
      if (page) {
        setData({
          ...data,
          events: [...data.events, ...page.events],
          hasMore: page.hasMore,
        })
      }
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : 'Unknown error'
      )
    } finally {
      setIsLoadingMore(false)
    }
  }

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!data) return []
    const oldestLoaded = data.events.at(-1)?.timestamp
    const feedbackItems = (data.feedback ?? [])
      .filter(
        (entry) =>
          !data.hasMore ||
          !oldestLoaded ||
          new Date(entry.createdAt) >= new Date(oldestLoaded)
      )
      .map(
        (entry): TimelineItem => ({
          kind: 'feedback',
          at: entry.createdAt,
          feedback: entry,
        })
      )
    const eventItems = data.events.map(
      (event): TimelineItem => ({ kind: 'event', at: event.timestamp, event })
    )
    return [...eventItems, ...feedbackItems].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
    )
  }, [data])

  const topEventTypes = useMemo(
    () =>
      Object.entries(data?.summary?.eventCounts ?? {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8),
    [data]
  )

  const summary = data?.summary

  return (
    <div className="min-w-0 space-y-6">
      <DialogHeader>
        <DialogTitle>Feedback details</DialogTitle>
        <DialogDescription>
          Submitted {formatDateTime(feedback.createdAt)} ·{' '}
          {formatContext(feedback)}
        </DialogDescription>
      </DialogHeader>

      <section className="rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#141414] p-4 space-y-4">
        <div className="flex items-center gap-3">
          {feedback.rating ? (
            <>
              <StarRating value={feedback.rating} />
              <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                {RATING_LABELS[feedback.rating]}
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-500 dark:text-zinc-500">
              No rating
            </span>
          )}
        </div>
        {feedback.message ? (
          <p className="whitespace-pre-wrap break-words text-gray-900 dark:text-zinc-100 leading-relaxed">
            {feedback.message}
          </p>
        ) : (
          <p className="italic text-gray-500 dark:text-zinc-500">No message</p>
        )}
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-gray-100 dark:border-white/8">
          <DetailRow
            label="Device"
            value={feedback.deviceType ?? 'Unknown'}
            icon={<DeviceTypeIcon type={feedback.deviceType} />}
          />
          <DetailRow
            label="Location"
            value={formatLocation(feedback.country, feedback.region)}
          />
          <DetailRow label="Source" value={formatContext(feedback)} />
          <DetailRow
            label="User agent"
            value={feedback.userAgent ?? 'Unknown'}
          />
        </dl>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <h3 className="shrink-0 font-semibold text-gray-900 dark:text-zinc-100">
              Device activity
            </h3>
            <code className="ml-2 truncate rounded bg-gray-100 dark:bg-white/8 px-1.5 py-0.5 text-xs text-gray-600 dark:text-zinc-400">
              {feedback.deviceId}
            </code>
            <CopyButton value={feedback.deviceId} label="Copy device id" />
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/admin/analytics?deviceId=${encodeURIComponent(feedback.deviceId)}`}
              target="_blank"
              rel="noopener"
            >
              <ExternalLink className="size-4" />
              Open in Analytics
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-gray-400" />
          </div>
        ) : error && !data ? (
          <p className="rounded-lg border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : data && summary ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <SummaryTile
                label="First seen"
                value={
                  summary.firstSeen ? formatDateTime(summary.firstSeen) : '—'
                }
              />
              <SummaryTile
                label="Last seen"
                value={
                  summary.lastSeen && now
                    ? formatRelativeTime(summary.lastSeen, now)
                    : '—'
                }
              />
              <SummaryTile
                label="Tracking events"
                value={summary.totalEvents.toLocaleString()}
              />
              <SummaryTile
                label="Feedback sent"
                value={String(data.feedback?.length ?? 0)}
              />
            </div>

            {topEventTypes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {topEventTypes.map(([type, count]) => (
                  <EventTypeBadge key={type} type={type} count={count} />
                ))}
              </div>
            )}

            {timeline.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500 dark:text-zinc-500">
                No tracking events recorded for this device.
              </p>
            ) : (
              <ol className="relative border-l border-gray-200 dark:border-white/8 ml-1.5 space-y-3">
                {timeline.map((item) =>
                  item.kind === 'feedback' ? (
                    <li
                      key={`feedback-${item.feedback._id}`}
                      className="relative pl-5"
                    >
                      <span className="absolute -left-[7px] top-3 flex size-3.5 items-center justify-center rounded-full bg-amber-500 ring-4 ring-white dark:ring-[#0a0a0a]" />
                      <div
                        className={cn(
                          'rounded-lg border p-3 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20',
                          item.feedback._id === feedback._id &&
                            'ring-2 ring-amber-400/60'
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <MessageSquareText className="size-3.5 text-amber-700 dark:text-amber-300" />
                          <span className="font-medium text-amber-900 dark:text-amber-200">
                            {item.feedback._id === feedback._id
                              ? 'This feedback'
                              : 'Feedback'}
                          </span>
                          {item.feedback.rating && (
                            <StarRating
                              value={item.feedback.rating}
                              size="sm"
                            />
                          )}
                          <span className="text-amber-800/70 dark:text-amber-300/70">
                            {formatDateTime(item.at)}
                          </span>
                        </div>
                        {item.feedback.message && (
                          <p className="mt-1 text-sm text-amber-950 dark:text-amber-100 line-clamp-2">
                            {item.feedback.message}
                          </p>
                        )}
                      </div>
                    </li>
                  ) : (
                    <li key={item.event._id} className="relative pl-5">
                      <EventToneDot
                        type={item.event.type}
                        className="absolute -left-[5px] top-1.5 size-2.5 ring-4 ring-white dark:ring-[#0a0a0a]"
                      />
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-mono text-xs text-gray-500 dark:text-zinc-500 tabular-nums">
                          {formatDateTime(item.at)}
                        </span>
                        <EventTypeBadge type={item.event.type} />
                      </div>
                      {summarizeMetadata(item.event.metadata) && (
                        <p className="mt-0.5 break-words text-xs text-gray-500 dark:text-zinc-500">
                          {summarizeMetadata(item.event.metadata)}
                        </p>
                      )}
                    </li>
                  )
                )}
              </ol>
            )}

            {data.hasMore && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore && <Loader2 className="size-4 animate-spin" />}
                  Load older events
                </Button>
              </div>
            )}
          </>
        ) : null}
      </section>
    </div>
  )
}

export default function DeviceActivityDialog({
  feedback,
  open,
  onOpenChange,
  onUnauthorized,
}: DeviceActivityDialogProps) {
  return (
    <Dialog open={open && feedback !== null} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[88vh] overflow-y-auto bg-gray-50 dark:bg-[#0a0a0a] dark:border-white/8">
        {feedback && (
          <DeviceActivityContent
            key={feedback._id}
            feedback={feedback}
            onUnauthorized={onUnauthorized}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
