'use client'

import DateRangePicker from '@/components/admin/DateRangePicker'
import DeviceTypeIcon from '@/components/admin/DeviceTypeIcon'
import { buildDateRangeParams } from '@/lib/attribution/stats'
import {
  FUNNEL_STEPS,
  findBiggestDrop,
  type FunnelSegment,
  type FunnelStats,
  type FunnelStep,
  type FunnelStepKey,
} from '@/lib/tracking/funnel'
import { cn } from '@/lib/utils'
import { formatRate } from '@/lib/waitlist/stats'
import { ArrowDown, Loader2, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { DateRange } from 'react-day-picker'

type Result =
  | { key: string; stats: FunnelStats; failed: false }
  | { key: string; stats: null; failed: true }

const STEP_BAR_CLASSES: Record<FunnelStepKey, string> = {
  arrived: 'bg-blue-400 dark:bg-blue-600',
  opened: 'bg-blue-500',
  added: 'bg-blue-600 dark:bg-blue-400',
  exported: 'bg-blue-800 dark:bg-blue-300',
  downloaded: 'bg-blue-950 dark:bg-blue-200',
}

const SEGMENTS: { value: FunnelSegment; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'desktop', label: 'Desktop' },
]

function segmentDevices(segment: FunnelSegment) {
  return segment === 'all' ? 'devices' : `${segment} devices`
}

function SegmentPicker({
  value,
  onChange,
}: {
  value: FunnelSegment
  onChange: (segment: FunnelSegment) => void
}) {
  return (
    <div
      role="group"
      aria-label="Device type"
      className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 sm:flex dark:bg-white/5"
    >
      {SEGMENTS.map((segment) => {
        const selected = segment.value === value
        return (
          <button
            key={segment.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(segment.value)}
            className={cn(
              'inline-flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
              selected
                ? 'bg-white text-gray-900 shadow-sm dark:bg-[#222222] dark:text-zinc-100'
                : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            )}
          >
            {segment.value !== 'all' && (
              <DeviceTypeIcon
                type={segment.value}
                className="hidden size-3.5 sm:block"
              />
            )}
            {segment.label}
          </button>
        )
      })}
    </div>
  )
}

function StepTransition({
  before,
  after,
  isBiggestDrop,
}: {
  before: number
  after: number
  isBiggestDrop: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2.5 text-xs text-gray-500 dark:text-zinc-400">
      <ArrowDown
        aria-hidden="true"
        className="size-3.5 shrink-0 text-gray-400 dark:text-zinc-500"
      />
      <span className="tabular-nums">
        {before > 0
          ? `${formatRate(after, before)} continued · ${(before - after).toLocaleString()} dropped off`
          : 'No one reached the step above'}
      </span>
      {isBiggestDrop && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          <TriangleAlert aria-hidden="true" className="size-3" />
          Biggest drop
        </span>
      )}
    </div>
  )
}

function FunnelChart({
  steps,
  segment,
  isRefreshing,
}: {
  steps: FunnelStep[]
  segment: FunnelSegment
  isRefreshing: boolean
}) {
  const start = steps[0].devices
  const end = steps[steps.length - 1].devices
  const biggestDrop = findBiggestDrop(steps)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          Arrival to download
        </p>
        <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-zinc-100">
          {isRefreshing ? (
            <Loader2 className="size-5 animate-spin text-gray-400" />
          ) : (
            formatRate(end, start)
          )}
        </div>
        {!isRefreshing && (
          <p className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
            {`${end.toLocaleString()} of ${start.toLocaleString()} ${segmentDevices(segment)} that arrived downloaded an image`}
          </p>
        )}
      </div>

      <ol
        aria-label="Journey funnel"
        className={cn('transition-opacity', isRefreshing && 'opacity-40')}
      >
        {steps.map((step, index) => {
          const definition = FUNNEL_STEPS[index]
          const share = (step.devices / start) * 100
          return (
            <li key={step.key}>
              {index > 0 && (
                <StepTransition
                  before={steps[index - 1].devices}
                  after={step.devices}
                  isBiggestDrop={biggestDrop === step.key}
                />
              )}
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                    {definition.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    {definition.description}
                  </p>
                </div>
                <p className="shrink-0 text-sm tabular-nums">
                  <span className="font-medium text-gray-900 dark:text-zinc-100">
                    {step.devices.toLocaleString()}
                  </span>
                  <span className="ml-2 inline-block min-w-9 text-right text-gray-500 dark:text-zinc-400">
                    {formatRate(step.devices, start)}
                  </span>
                </p>
              </div>
              <div
                aria-hidden="true"
                className="mt-2 h-4 rounded-r bg-gray-100 dark:bg-white/5"
              >
                <div
                  className={cn(
                    'h-full rounded-r transition-[width]',
                    STEP_BAR_CLASSES[step.key]
                  )}
                  style={{
                    width: `${share}%`,
                    minWidth: step.devices > 0 ? 4 : 0,
                  }}
                />
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default function JourneyFunnelPanel({
  refreshKey,
  country = 'all',
  region = 'all',
}: {
  refreshKey: number
  country?: string
  region?: string
}) {
  const [range, setRange] = useState<DateRange | undefined>()
  const [segment, setSegment] = useState<FunnelSegment>('all')
  const [result, setResult] = useState<Result | null>(null)

  const params = buildDateRangeParams(range)
  if (country !== 'all') params.set('country', country)
  if (region !== 'all') params.set('region', region)
  const query = params.toString()
  const requestKey = `${refreshKey}|${query}`

  useEffect(() => {
    let cancelled = false
    fetch(`/api/tracking/stats/funnel?${query}`)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.json() as Promise<FunnelStats>
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

  const isRefreshing = !!result && result.key !== requestKey
  const devicesByStep = new Map(
    (result?.stats?.[segment] ?? []).map((step) => [step.key, step.devices])
  )
  const steps = FUNNEL_STEPS.map(({ key }) => ({
    key,
    devices: devicesByStep.get(key) ?? 0,
  }))

  return (
    <section
      aria-labelledby="journey-funnel-heading"
      aria-busy={!result || isRefreshing}
      className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/8 dark:bg-[#141414]"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="journey-funnel-heading"
            className="text-sm font-medium text-gray-900 dark:text-zinc-100"
          >
            Journey funnel
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Unique devices that reached each step and every step before it.
            Follows the country and region filters.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <SegmentPicker value={segment} onChange={setSegment} />
          <DateRangePicker
            value={range}
            onChange={setRange}
            className="w-full sm:w-auto sm:min-w-56"
          />
        </div>
      </div>

      {!result || (result.failed && isRefreshing) ? (
        <Loader2 className="size-5 animate-spin text-gray-400" />
      ) : !result.stats ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load the journey funnel.
        </p>
      ) : steps[0].devices === 0 ? (
        <p
          className={cn(
            'text-sm text-gray-500 transition-opacity dark:text-zinc-400',
            isRefreshing && 'opacity-40'
          )}
        >
          {segment === 'all'
            ? 'No visits in this range yet.'
            : `No visits from ${segment} devices in this range yet.`}
        </p>
      ) : (
        <FunnelChart
          steps={steps}
          segment={segment}
          isRefreshing={isRefreshing}
        />
      )}
    </section>
  )
}
