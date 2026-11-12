'use client'

import Flag from '@/components/Flag'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StandardCard } from '@/components/ui/card-variants'
import { Input } from '@/components/ui/input'
import { useSettings } from '@/lib/contexts/SettingsContext'
import {
  setSchengenPassport,
  useSchengenPassport,
} from '@/lib/hooks/useSchengenPassport'
import {
  checkStay,
  daysPerCountry,
  getSchengenSummary,
  hasRecentSchengenDays,
  SCHENGEN_LIMIT,
  TAX_RESIDENCY_DAYS,
} from '@/lib/schengen'
import { toDayKey } from '@/lib/selection'
import { trackEvent } from '@/lib/tracking'
import { addDays, buildDayMap, countryName, pluralDays } from '@/lib/trips'
import type { CalendarData } from '@/lib/types'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'
import { AlertTriangle, CheckCircle2, Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const BAR = 'bg-[#2a78d6] dark:bg-[#3987e5]'

function formatDate(dayKey: string, withYear = false) {
  return dayjs(dayKey).format(withYear ? 'D MMM YYYY' : 'D MMM')
}

function Gauge({ used }: { used: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const share = Math.min(1, used / SCHENGEN_LIMIT)
  return (
    <svg
      viewBox="0 0 120 120"
      className="size-32 shrink-0 -rotate-90"
      aria-hidden="true"
    >
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        strokeWidth="10"
        className="stroke-gray-100 dark:stroke-white/8"
      />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${share * circumference} ${circumference}`}
        className="stroke-[#2a78d6] dark:stroke-[#3987e5]"
      />
    </svg>
  )
}

interface SchengenCardProps {
  calendarData: CalendarData
  today?: Date
}

export default function SchengenCard({
  calendarData,
  today,
}: SchengenCardProps) {
  const { settings } = useSettings()
  const todayKey = toDayKey(today ?? new Date())
  const passport = useSchengenPassport()
  const dayMap = useMemo(
    () => buildDayMap(calendarData.visits),
    [calendarData.visits]
  )
  const visible = hasRecentSchengenDays(dayMap, todayKey)
  const summary = useMemo(
    () => getSchengenSummary(dayMap, todayKey),
    [dayMap, todayKey]
  )
  const perCountry = useMemo(
    () => daysPerCountry(dayMap, todayKey).slice(0, 5),
    [dayMap, todayKey]
  )
  const [planStart, setPlanStart] = useState(() => addDays(todayKey, 30))
  const [planLength, setPlanLength] = useState(14)
  const plan = useMemo(
    () => checkStay(dayMap, planStart, planLength),
    [dayMap, planStart, planLength]
  )
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  useEffect(() => {
    if (!visible) return
    trackEvent('schengen_counter_shown', {
      passport: passport ?? 'unknown',
      left: summary.left,
    })
  }, [visible, passport, summary.left])

  if (!visible) return null

  const answer = (value: 'free' | 'limited') => {
    setSchengenPassport(value)
    trackEvent('schengen_passport_set', { passport: value })
  }

  const hovered = hoveredDay !== null ? summary.windowDays[hoveredDay] : null

  return (
    <StandardCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-zinc-100">
          <span className="text-2xl">🛂</span>
          Schengen 90/180
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {passport === null && (
          <div className="flex flex-col gap-3 rounded-lg bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-white/4">
            <p className="text-sm text-gray-700 dark:text-zinc-300">
              Do you travel on an EU, EEA or Swiss passport?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => answer('free')}
              >
                Yes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => answer('limited')}
              >
                No
              </Button>
            </div>
          </div>
        )}

        {passport === 'free' ? (
          <div className="space-y-2">
            <p className="font-serif text-2xl text-gray-900 dark:text-zinc-100">
              No Schengen limit for you
            </p>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              Your passport lets you stay in the Schengen area as long as you
              like, so there&apos;s nothing to count.{' '}
              <button
                type="button"
                onClick={() => setSchengenPassport(null)}
                className="cursor-pointer font-medium text-gray-900 underline underline-offset-2 dark:text-zinc-100"
              >
                Change
              </button>
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <div className="relative">
                <Gauge used={summary.used} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-semibold tabular-nums text-gray-900 dark:text-white">
                    {summary.left}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-zinc-400">
                    days left
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-center sm:text-left">
                <p className="text-gray-700 dark:text-zinc-300">
                  You&apos;ve used{' '}
                  <strong className="text-gray-900 dark:text-zinc-100">
                    {summary.used} of {SCHENGEN_LIMIT} days
                  </strong>{' '}
                  since {formatDate(summary.windowStart, true)}.
                </p>
                {summary.left < 15 && (
                  <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-amber-700 sm:justify-start dark:text-amber-400">
                    <AlertTriangle className="size-4" aria-hidden="true" />
                    Fewer than 15 days left
                  </p>
                )}
                <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  {summary.countries.map((c) => (
                    <span
                      key={c.code}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-white/8 dark:text-zinc-300"
                    >
                      <Flag
                        countryCode={c.code}
                        displayMode={settings.flagDisplayMode}
                        size="sm"
                      />
                      {pluralDays(c.days)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-zinc-400">
                <span>Last 180 days, one square per day</span>
                <span className="text-right">
                  {hovered
                    ? `${formatDate(hovered.key, true)} · ${hovered.country ? countryName(hovered.country) : 'Outside Schengen'}`
                    : ''}
                </span>
              </div>
              <div
                className="grid grid-cols-30 gap-0.5 xl:grid-cols-60"
                onPointerLeave={() => setHoveredDay(null)}
                aria-hidden="true"
              >
                {summary.windowDays.map((day, i) => (
                  <span
                    key={day.key}
                    onPointerEnter={() => setHoveredDay(i)}
                    className={cn(
                      'aspect-square rounded-[2px]',
                      day.country ? BAR : 'bg-gray-100 dark:bg-white/6',
                      hoveredDay === i && 'ring-2 ring-gray-900 dark:ring-white'
                    )}
                  />
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-gray-400 dark:text-zinc-500">
                <span>{formatDate(summary.windowStart)}</span>
                <span>Today</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {summary.projection.map((p) => (
                <div
                  key={p.key}
                  className="rounded-lg border border-gray-200 p-3 dark:border-white/8"
                >
                  <div className="text-xs text-gray-500 dark:text-zinc-400">
                    On {formatDate(p.key)}
                  </div>
                  <div className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">
                    {p.left}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-zinc-400">
                    days left
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-white/8">
              <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                Planning a Schengen trip?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5 text-sm">
                  <span className="text-gray-600 dark:text-zinc-400">
                    Arrive
                  </span>
                  <Input
                    type="date"
                    value={planStart}
                    min={addDays(todayKey, 1)}
                    onChange={(e) =>
                      e.target.value && setPlanStart(e.target.value)
                    }
                  />
                </label>
                <div className="space-y-1.5 text-sm">
                  <span className="text-gray-600 dark:text-zinc-400">Days</span>
                  <div className="flex h-9 items-center justify-between rounded-md border border-input px-1 dark:bg-input/30">
                    <button
                      type="button"
                      aria-label="One day fewer"
                      className="cursor-pointer rounded p-1.5 hover:bg-gray-100 dark:hover:bg-white/8"
                      onClick={() => setPlanLength((n) => Math.max(1, n - 1))}
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="font-medium tabular-nums">
                      {planLength}
                    </span>
                    <button
                      type="button"
                      aria-label="One day more"
                      className="cursor-pointer rounded p-1.5 hover:bg-gray-100 dark:hover:bg-white/8"
                      onClick={() => setPlanLength((n) => Math.min(120, n + 1))}
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <div
                role="status"
                className={cn(
                  'flex gap-3 rounded-lg p-3 text-sm',
                  plan.firstOver
                    ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                    : 'bg-gray-50 text-gray-800 dark:bg-white/5 dark:text-zinc-200'
                )}
              >
                {plan.firstOver ? (
                  <>
                    <AlertTriangle
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <p>
                      Too long. You&apos;d pass 90 days on{' '}
                      {formatDate(plan.firstOver, true)}, so leave by{' '}
                      {formatDate(plan.lastSafeDay!, true)}.
                    </p>
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <p>
                      That works. At most you&apos;d have used {plan.maxUsed} of
                      90 days, with {pluralDays(SCHENGEN_LIMIT - plan.maxUsed)}{' '}
                      to spare.
                    </p>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {perCountry.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
              Days per country, last 12 months
            </p>
            {perCountry.map((c) => (
              <div key={c.code} className="flex items-center gap-3 text-sm">
                <Flag
                  countryCode={c.code}
                  displayMode={settings.flagDisplayMode}
                  size="sm"
                />
                <span className="w-28 truncate text-gray-700 dark:text-zinc-300">
                  {countryName(c.code)}
                </span>
                <div className="h-2 flex-1 rounded-full bg-gray-100 dark:bg-white/8">
                  <div
                    className={cn('h-full rounded-full', BAR)}
                    style={{
                      width: `${Math.min(100, (c.days / TAX_RESIDENCY_DAYS) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-16 text-right tabular-nums text-gray-900 dark:text-zinc-100">
                  {c.days}
                  <span className="text-gray-400 dark:text-zinc-500">
                    /{TAX_RESIDENCY_DAYS}
                  </span>
                </span>
              </div>
            ))}
            <p className="text-xs text-gray-500 dark:text-zinc-500">
              Many countries treat 183 days in a year as tax residency.
            </p>
          </div>
        )}

        <p className="text-xs leading-relaxed text-gray-500 dark:text-zinc-500">
          Worked out from the days in your calendar: every day in a Schengen
          country counts, arrival and departure days included. It&apos;s a
          guide, not legal advice. Check the official rules before you travel.
        </p>
      </CardContent>
    </StandardCard>
  )
}
