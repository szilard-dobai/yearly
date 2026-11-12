'use client'

import Flag from '@/components/Flag'
import { CardContent } from '@/components/ui/card'
import { DarkCard, StandardCard } from '@/components/ui/card-variants'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { toDayKey } from '@/lib/selection'
import { trackEvent } from '@/lib/tracking'
import {
  countryName,
  daysBetween,
  formatDay,
  formatDayRange,
  getTripStatus,
  getTrips,
  getUpcomingTrips,
  pluralDays,
  tripName,
} from '@/lib/trips'
import type { CalendarData } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useEffect, useMemo } from 'react'

const BIG_FLAG = 'text-4xl sm:text-5xl w-12 h-8 sm:w-15 sm:h-10'

interface TripCountdownProps {
  calendarData: CalendarData
  today?: Date
}

export default function TripCountdown({
  calendarData,
  today,
}: TripCountdownProps) {
  const { settings } = useSettings()
  const todayKey = toDayKey(today ?? new Date())
  const { status, upcoming } = useMemo(() => {
    const { dayMap, trips } = getTrips(calendarData.visits)
    return {
      status: getTripStatus(trips, dayMap, todayKey),
      upcoming: getUpcomingTrips(trips, todayKey),
    }
  }, [calendarData.visits, todayKey])

  const trackingKey =
    status.kind === 'none' ? null : `${status.kind}:${status.trip.start}`

  useEffect(() => {
    if (!trackingKey) return
    const [state] = trackingKey.split(':')
    trackEvent('trip_countdown_shown', { state })
  }, [trackingKey])

  if (status.kind === 'none') return null

  if (status.kind === 'during') {
    const { trip, country, dayNumber, totalDays } = status
    const left = totalDays - dayNumber
    return (
      <DarkCard className="py-5" aria-live="polite">
        <CardContent className="flex items-center gap-4">
          <Flag
            countryCode={country}
            displayMode={settings.flagDisplayMode}
            className={BIG_FLAG}
          />
          <div className="min-w-0 flex-1">
            <p className="font-serif text-2xl leading-tight sm:text-3xl">
              Have fun in {countryName(country)}!
            </p>
            <div className="mt-2.5 flex gap-1" aria-hidden="true">
              {trip.days.map((day, i) => (
                <span
                  key={day}
                  className={cn(
                    'h-1 flex-1 rounded-full',
                    i < dayNumber ? 'bg-white' : 'bg-white/20'
                  )}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-white/60">
              Day {dayNumber} of {totalDays} ·{' '}
              {left === 0
                ? 'last day'
                : `${pluralDays(left)} left, home on ${formatDay(trip.end)}`}
            </p>
          </div>
        </CardContent>
      </DarkCard>
    )
  }

  const { trip, daysUntil } = status
  const then = upcoming[1]
  return (
    <StandardCard className="gap-0 py-0">
      <CardContent className="flex items-center gap-4 py-4">
        <Flag
          countryCode={trip.countries[0]}
          displayMode={settings.flagDisplayMode}
          className={BIG_FLAG}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-widest text-gray-500 dark:text-zinc-500">
            {daysUntil <= 7 ? 'Pack your bags' : 'Next trip'}
          </p>
          <p className="truncate font-serif text-2xl text-gray-900 dark:text-zinc-100">
            {tripName(trip)}
          </p>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            {formatDayRange(trip.start, trip.end)} ·{' '}
            {pluralDays(trip.days.length)}
          </p>
        </div>
        <div className="text-right text-gray-900 dark:text-white">
          {daysUntil === 1 ? (
            <span className="font-serif text-3xl">Tomorrow</span>
          ) : (
            <>
              <span className="block font-serif text-5xl leading-none tabular-nums">
                {daysUntil}
              </span>
              <span className="text-xs text-gray-500 dark:text-zinc-400">
                days to go
              </span>
            </>
          )}
        </div>
      </CardContent>
      {then && (
        <div className="flex items-center gap-2 border-t border-gray-100 px-6 py-2.5 text-xs text-gray-500 dark:border-white/8 dark:text-zinc-400">
          Then
          <Flag
            countryCode={then.countries[0]}
            displayMode={settings.flagDisplayMode}
            size="sm"
          />
          {tripName(then)} in {pluralDays(daysBetween(todayKey, then.start))}
          {upcoming.length > 2 && ` · ${upcoming.length - 2} more planned`}
        </div>
      )}
    </StandardCard>
  )
}
