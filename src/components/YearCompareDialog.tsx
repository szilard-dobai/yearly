'use client'

import Flag from '@/components/Flag'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { MONTH_NAMES, MONTH_NAMES_SHORT } from '@/lib/constants'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { trackEvent } from '@/lib/tracking'
import { getTrips, pluralDays } from '@/lib/trips'
import type { CalendarData } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  compareHeadline,
  summarizeYear,
  type YearSummary,
} from '@/lib/year-summary'
import { ArrowDown, ArrowUp, ArrowLeftRight, Minus } from 'lucide-react'
import { useMemo, useState } from 'react'

const SERIES = {
  previous: 'bg-[#eb6834] dark:bg-[#d95926]',
  current: 'bg-[#2a78d6] dark:bg-[#3987e5]',
}

function Delta({
  from,
  to,
  suffix = '',
}: {
  from: number
  to: number
  suffix?: string
}) {
  const diff = to - from
  const Icon = diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : Minus
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-zinc-300">
      <Icon className="size-3.5" aria-hidden="true" />
      {diff === 0 ? 'Same' : `${diff > 0 ? '+' : ''}${diff}${suffix}`}
    </span>
  )
}

function FlagList({ codes }: { codes: string[] }) {
  const { settings } = useSettings()
  if (codes.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-zinc-600">None</p>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {codes.map((code) => (
        <Flag
          key={code}
          countryCode={code}
          displayMode={settings.flagDisplayMode}
        />
      ))}
    </div>
  )
}

function MonthChart({
  previous,
  current,
}: {
  previous: YearSummary
  current: YearSummary
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const max =
    Math.ceil(Math.max(1, ...previous.months, ...current.months) / 4) * 4
  const ticks = [0, max / 2, max]
  const peak = (months: number[]) => months.indexOf(Math.max(...months))
  const peaks = {
    previous: peak(previous.months),
    current: peak(current.months),
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100">
          Days abroad by month
        </h3>
        <div className="flex gap-4 text-xs text-gray-500 dark:text-zinc-400">
          {(['previous', 'current'] as const).map((key) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className={cn('size-2.5 rounded-sm', SERIES[key])} />
              {(key === 'previous' ? previous : current).year}
            </span>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex h-44 w-6 flex-col-reverse justify-between text-right text-[10px] tabular-nums text-gray-400 dark:text-zinc-500">
          {ticks.map((t) => (
            <span key={t} className="-my-1.5 leading-3">
              {t}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-44">
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute inset-x-0 border-t border-gray-100 dark:border-white/6"
                style={{ bottom: `${(t / max) * 100}%` }}
              />
            ))}
          </div>
          <div className="relative grid h-44 grid-cols-12 gap-1 sm:gap-2">
            {MONTH_NAMES_SHORT.map((label, i) => (
              <button
                key={label}
                type="button"
                aria-label={`${MONTH_NAMES[i]}: ${previous.months[i]} days in ${previous.year}, ${current.months[i]} days in ${current.year}`}
                className={cn(
                  'relative flex h-full cursor-default items-end justify-center gap-0.5 rounded-sm',
                  hovered === i && 'bg-gray-100 dark:bg-white/5'
                )}
                onPointerEnter={() => setHovered(i)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
              >
                {(['previous', 'current'] as const).map((key) => {
                  const value = (key === 'previous' ? previous : current)
                    .months[i]
                  return (
                    <span
                      key={key}
                      className={cn(
                        'relative w-full max-w-3 rounded-t-[4px]',
                        SERIES[key]
                      )}
                      style={{ height: `${(value / max) * 100}%` }}
                    >
                      {peaks[key] === i && value > 0 && (
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-medium tabular-nums text-gray-600 dark:text-zinc-300">
                          {value}
                        </span>
                      )}
                    </span>
                  )
                })}
                {hovered === i && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-6 w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-left text-xs shadow-md dark:border-white/8 dark:bg-[#1a1a1a]">
                    <span className="block font-medium text-gray-900 dark:text-zinc-100">
                      {MONTH_NAMES[i]}
                    </span>
                    {(['previous', 'current'] as const).map((key) => {
                      const summary = key === 'previous' ? previous : current
                      return (
                        <span
                          key={key}
                          className="flex items-center gap-1.5 text-gray-600 dark:text-zinc-300"
                        >
                          <span
                            className={cn('size-2 rounded-sm', SERIES[key])}
                          />
                          {summary.year}: {pluralDays(summary.months[i])}
                        </span>
                      )
                    })}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-12 gap-1 text-center text-[10px] text-gray-500 sm:gap-2 dark:text-zinc-500">
            {MONTH_NAMES_SHORT.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface YearCompareDialogProps {
  calendarData: CalendarData
  year: number
}

export default function YearCompareDialog({
  calendarData,
  year,
}: YearCompareDialogProps) {
  const [open, setOpen] = useState(false)
  const { previous, current } = useMemo(() => {
    const { dayMap, trips } = getTrips(calendarData.visits)
    return {
      previous: summarizeYear(dayMap, trips, year - 1),
      current: summarizeYear(dayMap, trips, year),
    }
  }, [calendarData.visits, year])

  if (previous.days === 0) return null

  const previousCodes = new Set(previous.countries.map((c) => c.code))
  const currentCodes = new Set(current.countries.map((c) => c.code))
  const rows = [
    {
      label: 'Countries',
      a: previous.countries.length,
      b: current.countries.length,
    },
    { label: 'Days abroad', a: previous.days, b: current.days },
    { label: 'Trips', a: previous.trips.length, b: current.trips.length },
    {
      label: 'Longest trip',
      a: previous.longestTrip?.days.length ?? 0,
      b: current.longestTrip?.days.length ?? 0,
      suffix: ' days',
    },
    {
      label: 'Continents',
      a: previous.continents.length,
      b: current.continents.length,
    },
  ]

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          trackEvent('year_compare_open', { year })
          setOpen(true)
        }}
        className="text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeftRight className="size-4" />
        vs {year - 1}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="space-y-8">
            <div className="pr-6">
              <DialogTitle className="font-serif text-2xl font-normal leading-snug sm:text-3xl">
                {compareHeadline(previous, current)}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {year} next to {year - 1}, from the trips in your calendar.
              </DialogDescription>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/8">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 dark:bg-[#1a1a1a] dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2.5 font-medium sm:px-4">
                      <span className="sr-only">Measure</span>
                    </th>
                    {(['previous', 'current'] as const).map((key) => (
                      <th key={key} className="px-3 py-2.5 font-medium sm:px-4">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={cn('size-2.5 rounded-sm', SERIES[key])}
                          />
                          {(key === 'previous' ? previous : current).year}
                        </span>
                      </th>
                    ))}
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                      Change
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/8">
                  {rows.map((row) => (
                    <tr key={row.label}>
                      <td className="px-3 py-3 text-gray-600 sm:px-4 dark:text-zinc-400">
                        {row.label}
                      </td>
                      <td className="px-3 py-3 font-medium tabular-nums text-gray-900 sm:px-4 dark:text-zinc-100">
                        {row.a}
                      </td>
                      <td className="px-3 py-3 font-medium tabular-nums text-gray-900 sm:px-4 dark:text-zinc-100">
                        {row.b}
                        <span className="mt-0.5 block sm:hidden">
                          <Delta from={row.a} to={row.b} suffix={row.suffix} />
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <Delta from={row.a} to={row.b} suffix={row.suffix} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <MonthChart previous={previous} current={current} />

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-zinc-100">
                  New in {year}
                </h3>
                <FlagList
                  codes={current.countries
                    .map((c) => c.code)
                    .filter((code) => !previousCodes.has(code))}
                />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-zinc-100">
                  Back again
                </h3>
                <FlagList
                  codes={current.countries
                    .map((c) => c.code)
                    .filter((code) => previousCodes.has(code))}
                />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-zinc-100">
                  Only in {year - 1}
                </h3>
                <FlagList
                  codes={previous.countries
                    .map((c) => c.code)
                    .filter((code) => !currentCodes.has(code))}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
