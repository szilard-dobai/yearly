'use client'

import { Flag } from '@/components/Emoji'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { MONTH_NAMES, MONTH_NAMES_SHORT } from '@/lib/constants'
import { useTodayKey } from '@/lib/hooks/useTodayKey'
import { trackEvent } from '@/lib/tracking'
import { countryName, getTrips, pluralDays } from '@/lib/trips'
import type { CalendarData } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  compareHeadline,
  summarizeYear,
  type YearSummary,
} from '@/lib/year-summary'
import { ArrowDown, ArrowLeftRight, ArrowUp, Minus } from 'lucide-react'
import { useMemo, useState } from 'react'

const SERIES = {
  previous: 'bg-[#eb6834] dark:bg-[#d95926]',
  current: 'bg-[#2a78d6] dark:bg-[#3987e5]',
}

const SERIES_KEYS = ['previous', 'current'] as const

interface Row {
  label: string
  previous: number
  current: number
  inDays?: boolean
}

function Delta({ row }: { row: Row }) {
  const diff = row.current - row.previous
  const Icon = diff > 0 ? ArrowUp : diff < 0 ? ArrowDown : Minus
  const amount = row.inDays ? pluralDays(Math.abs(diff)) : Math.abs(diff)
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-zinc-300">
      <Icon className="size-3.5" aria-hidden="true" />
      {diff === 0 ? 'Same' : `${diff > 0 ? '+' : '−'}${amount}`}
    </span>
  )
}

function FlagList({ title, codes }: { title: string; codes: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-zinc-100">
        {title}
      </h3>
      {codes.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-zinc-500">None</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {codes.map((code) => (
            <li key={code}>
              <Flag
                code={code}
                alt={countryName(code)}
                title={countryName(code)}
                className="text-2xl"
              />
            </li>
          ))}
        </ul>
      )}
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
  const summaries = { previous, current }
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
          {SERIES_KEYS.map((key) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className={cn('size-2.5 rounded-sm', SERIES[key])} />
              {summaries[key].year}
            </span>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex h-44 w-6 flex-col-reverse justify-between text-right text-[10px] text-gray-400 tabular-nums dark:text-zinc-500">
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
                aria-label={`${MONTH_NAMES[i]}: ${pluralDays(previous.months[i])} in ${previous.year}, ${pluralDays(current.months[i])} in ${current.year}`}
                className={cn(
                  'relative flex h-full cursor-default items-end justify-center gap-0.5 rounded-sm',
                  hovered === i && 'bg-gray-100 dark:bg-white/5'
                )}
                onPointerEnter={() => setHovered(i)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
              >
                {SERIES_KEYS.map((key) => {
                  const value = summaries[key].months[i]
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
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gray-600 tabular-nums dark:text-zinc-300">
                          {value}
                        </span>
                      )}
                    </span>
                  )
                })}
                {hovered === i && (
                  <span
                    className={cn(
                      'pointer-events-none absolute bottom-full z-10 mb-6 w-max rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-left text-xs shadow-md dark:border-white/8 dark:bg-[#1a1a1a]',
                      i < 2
                        ? 'left-0'
                        : i > 9
                          ? 'right-0'
                          : 'left-1/2 -translate-x-1/2'
                    )}
                  >
                    <span className="block font-medium text-gray-900 dark:text-zinc-100">
                      {MONTH_NAMES[i]}
                    </span>
                    {SERIES_KEYS.map((key) => (
                      <span
                        key={key}
                        className="flex items-center gap-1.5 text-gray-600 dark:text-zinc-300"
                      >
                        <span
                          className={cn('size-2 rounded-sm', SERIES[key])}
                        />
                        {summaries[key].year}:{' '}
                        {pluralDays(summaries[key].months[i])}
                      </span>
                    ))}
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
  today?: Date
}

export default function YearCompareDialog({
  calendarData,
  year,
  today,
}: YearCompareDialogProps) {
  const todayKey = useTodayKey(today)
  const [open, setOpen] = useState(false)
  const { previous, current } = useMemo(() => {
    const { dayMap, trips } = getTrips(calendarData.visits)
    return {
      previous: summarizeYear(dayMap, trips, year - 1),
      current: summarizeYear(dayMap, trips, year),
    }
  }, [calendarData.visits, year])

  if (!todayKey || previous.days === 0 || current.days === 0) return null

  const yearOver = todayKey > `${year}-12-31`
  const hasPlanned = current.trips.some((trip) => trip.end > todayKey)
  const currentCodes = new Set(current.countries.map((c) => c.code))
  const rows: Row[] = [
    {
      label: 'Countries',
      previous: previous.countries.length,
      current: current.countries.length,
    },
    { label: 'Days abroad', previous: previous.days, current: current.days },
    {
      label: 'Trips',
      previous: previous.trips.length,
      current: current.trips.length,
    },
    {
      label: 'Longest trip',
      previous: previous.longestTrip?.days.length ?? 0,
      current: current.longestTrip?.days.length ?? 0,
      inDays: true,
    },
    {
      label: 'Continents',
      previous: previous.continents.length,
      current: current.continents.length,
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
        className="-my-1 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
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
              <DialogTitle className="font-serif text-2xl leading-snug font-normal sm:text-3xl">
                {compareHeadline(previous, current, yearOver)}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {year} next to {year - 1}, from the trips in your calendar
                {hasPlanned ? ', planned ones included' : ''}.
              </DialogDescription>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/8">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 dark:bg-[#1a1a1a] dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2.5 font-medium sm:px-4">
                      <span className="sr-only">Measure</span>
                    </th>
                    {SERIES_KEYS.map((key) => (
                      <th key={key} className="px-3 py-2.5 font-medium sm:px-4">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={cn('size-2.5 rounded-sm', SERIES[key])}
                          />
                          {key === 'previous' ? previous.year : current.year}
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
                      <td className="px-3 py-3 font-medium text-gray-900 tabular-nums sm:px-4 dark:text-zinc-100">
                        {row.previous}
                      </td>
                      <td className="px-3 py-3 font-medium text-gray-900 tabular-nums sm:px-4 dark:text-zinc-100">
                        {row.current}
                        <span className="mt-0.5 block sm:hidden">
                          <Delta row={row} />
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <Delta row={row} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <MonthChart previous={previous} current={current} />

            <div className="grid gap-5 sm:grid-cols-3">
              <FlagList title={`New in ${year}`} codes={current.newCountries} />
              <FlagList title="Back again" codes={current.returningCountries} />
              <FlagList
                title={`Only in ${year - 1}`}
                codes={previous.countries
                  .map((c) => c.code)
                  .filter((code) => !currentCodes.has(code))}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
