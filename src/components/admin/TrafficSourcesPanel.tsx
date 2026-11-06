'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDateTime } from '@/lib/admin/format'
import {
  buildDateRangeParams,
  type SourceCount,
  type TrafficSourceStats,
} from '@/lib/attribution/stats'
import { getSurveyAnswerLabel } from '@/lib/attribution/survey'
import { cn } from '@/lib/utils'
import { formatRate } from '@/lib/waitlist/stats'
import { Loader2 } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

type Result =
  | { key: string; stats: TrafficSourceStats; failed: false }
  | { key: string; stats: null; failed: true }

function Summary({
  label,
  value,
  hint,
  isRefreshing,
}: {
  label: string
  value: number
  hint: ReactNode
  isRefreshing: boolean
}) {
  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-zinc-400">{label}</p>
      <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-zinc-100">
        {isRefreshing ? (
          <Loader2 className="size-5 animate-spin text-gray-400" />
        ) : (
          value.toLocaleString()
        )}
      </div>
      {!isRefreshing && (
        <p className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
          {hint}
        </p>
      )}
    </div>
  )
}

function SourceTable({
  title,
  rows,
  formatLabel = (label) => label,
}: {
  title: string
  rows: SourceCount[]
  formatLabel?: (label: string) => string
}) {
  return (
    <div className="min-w-0">
      <h3 className="mb-1 text-xs font-medium text-gray-500 dark:text-zinc-400">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="py-1.5 text-sm text-gray-400 dark:text-zinc-500">
          None yet
        </p>
      ) : (
        <table aria-label={title} className="w-full text-sm">
          <thead className="sr-only">
            <tr>
              <th>{title}</th>
              <th>Devices</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/8">
            {rows.map((row) => {
              const label = formatLabel(row.label)
              return (
                <tr
                  key={row.label}
                  className="text-gray-900 dark:text-zinc-100"
                >
                  <td
                    className="w-full max-w-0 truncate py-1.5 pr-3"
                    title={label}
                  >
                    {label}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {row.devices.toLocaleString()}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function TrafficSourcesPanel({
  refreshKey,
  country = 'all',
  region = 'all',
}: {
  refreshKey: number
  country?: string
  region?: string
}) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  const params = buildDateRangeParams(from, to)
  if (country !== 'all') params.set('country', country)
  if (region !== 'all') params.set('region', region)
  const query = params.toString()
  const requestKey = `${refreshKey}|${query}`

  useEffect(() => {
    let cancelled = false
    fetch(`/api/tracking/stats/traffic-sources?${query}`)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.json() as Promise<TrafficSourceStats>
      })
      .then((stats) => {
        if (!cancelled) setResult({ key: requestKey, stats, failed: false })
      })
      .catch(() => {
        if (!cancelled)
          setResult({ key: requestKey, stats: null, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [query, requestKey])

  const stats = result?.stats
  const isRefreshing = !!result && result.key !== requestKey

  return (
    <section
      aria-labelledby="traffic-sources-heading"
      aria-busy={!result || isRefreshing}
      className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/8 dark:bg-[#141414]"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="traffic-sources-heading"
            className="text-sm font-medium text-gray-900 dark:text-zinc-100"
          >
            Traffic sources
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Unique devices from page views and the post-download question.
            Follows the country and region filters.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="space-y-1">
            <Label htmlFor="traffic-sources-from" className="text-xs">
              From
            </Label>
            <Input
              id="traffic-sources-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
              className="h-8 w-36 dark:scheme-dark"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="traffic-sources-to" className="text-xs">
              To
            </Label>
            <Input
              id="traffic-sources-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
              className="h-8 w-36 dark:scheme-dark"
            />
          </div>
        </div>
      </div>

      {!result || (result.failed && isRefreshing) ? (
        <Loader2 className="size-5 animate-spin text-gray-400" />
      ) : !stats ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load the traffic sources.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Summary
              label="Devices tracked"
              value={stats.trackedDevices}
              hint="Since page views started recording sources"
              isRefreshing={isRefreshing}
            />
            <Summary
              label="With a known source"
              value={stats.attributedDevices}
              hint={
                stats.trackedDevices > 0
                  ? `${formatRate(stats.attributedDevices, stats.trackedDevices)} had a referrer, UTM tags or an in-app browser`
                  : 'A referrer, UTM tags or an in-app browser'
              }
              isRefreshing={isRefreshing}
            />
            <Summary
              label="Answered the question"
              value={stats.survey.answered}
              hint={`Of ${stats.survey.shown.toLocaleString()} shown, ${stats.survey.dismissed.toLocaleString()} dismissed`}
              isRefreshing={isRefreshing}
            />
          </div>

          <div
            className={cn(
              'grid gap-6 transition-opacity sm:grid-cols-2 lg:grid-cols-3',
              isRefreshing && 'opacity-40'
            )}
          >
            <SourceTable title="Referrers" rows={stats.referrers} />
            <SourceTable title="In-app browsers" rows={stats.inAppBrowsers} />
            <SourceTable
              title="How they heard about Yearly"
              rows={stats.survey.answers}
              formatLabel={getSurveyAnswerLabel}
            />
            <SourceTable title="UTM source" rows={stats.utm.source} />
            <SourceTable title="UTM medium" rows={stats.utm.medium} />
            <SourceTable title="UTM campaign" rows={stats.utm.campaign} />
          </div>

          {stats.survey.notes.length > 0 && (
            <div
              className={cn('transition-opacity', isRefreshing && 'opacity-40')}
            >
              <h3 className="mb-1 text-xs font-medium text-gray-500 dark:text-zinc-400">
                &ldquo;Other&rdquo; answers
              </h3>
              <ul className="divide-y divide-gray-100 dark:divide-white/8">
                {stats.survey.notes.map((note) => (
                  <li
                    key={`${note.timestamp}-${note.text}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5 text-sm"
                  >
                    <span className="min-w-0 wrap-break-word text-gray-900 dark:text-zinc-100">
                      {note.text}
                    </span>
                    <span className="text-xs text-gray-400 tabular-nums dark:text-zinc-500">
                      {[note.country, formatDateTime(note.timestamp)]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
