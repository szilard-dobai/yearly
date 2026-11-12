'use client'

import { Button } from '@/components/ui/button'
import { CardContent } from '@/components/ui/card'
import { StandardCard } from '@/components/ui/card-variants'
import { MONTH_NAMES_SHORT } from '@/lib/constants'
import {
  dismissTravelNudge,
  useNudgeDismissedMonth,
} from '@/lib/hooks/useNudgeDismissed'
import { getMonthNudge, nudgeMessage, type MonthDays } from '@/lib/nudges'
import { toDayKey } from '@/lib/selection'
import { trackEvent } from '@/lib/tracking'
import {
  daysBetween,
  getTrips,
  getUpcomingTrips,
  pluralDays,
  tripName,
} from '@/lib/trips'
import type { CalendarData } from '@/lib/types'
import { CalendarPlus, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'

interface TravelNudgeCardProps {
  calendarData: CalendarData
  onPlanTrip: () => void
  today?: Date
}

function MonthBar({ month, max }: { month: MonthDays; max: number }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-9 text-gray-500 dark:text-zinc-400">
        {MONTH_NAMES_SHORT[month.month]}
      </span>
      <div className="h-3 flex-1">
        <div
          className="h-full min-w-1 rounded-r-[4px] bg-gray-900 dark:bg-zinc-100"
          style={{
            width: `${(month.days / max) * 100}%`,
            opacity: month.days ? 1 : 0.2,
          }}
        />
      </div>
      <span className="w-14 text-right tabular-nums text-gray-700 dark:text-zinc-300">
        {pluralDays(month.days)}
      </span>
    </div>
  )
}

export default function TravelNudgeCard({
  calendarData,
  onPlanTrip,
  today,
}: TravelNudgeCardProps) {
  const todayKey = toDayKey(today ?? new Date())
  const monthKey = todayKey.slice(0, 7)
  const dismissedMonth = useNudgeDismissedMonth()
  const { nudge, next } = useMemo(() => {
    const { dayMap, trips } = getTrips(calendarData.visits)
    return {
      nudge: getMonthNudge(dayMap, todayKey),
      next: getUpcomingTrips(trips, todayKey)[0] ?? null,
    }
  }, [calendarData.visits, todayKey])

  const hidden = calendarData.visits.length === 0 || dismissedMonth === monthKey

  useEffect(() => {
    if (hidden) return
    trackEvent('travel_nudge_shown', { direction: nudge.direction })
  }, [hidden, nudge.direction])

  if (hidden) return null

  const max = Math.max(1, nudge.earlier.days, nudge.later.days)

  return (
    <StandardCard>
      <CardContent className="relative space-y-4">
        <button
          type="button"
          aria-label="Hide until next month"
          onClick={() => {
            trackEvent('travel_nudge_dismissed', { direction: nudge.direction })
            dismissTravelNudge(monthKey)
          }}
          className="absolute -top-2 right-4 cursor-pointer rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-500 dark:hover:bg-white/8 dark:hover:text-zinc-200"
        >
          <X className="size-4" />
        </button>
        <p className="pr-6 font-serif text-xl leading-snug text-gray-900 dark:text-zinc-100">
          {nudgeMessage(nudge)}
        </p>
        <div className="space-y-2.5">
          <MonthBar month={nudge.earlier} max={max} />
          <MonthBar month={nudge.later} max={max} />
        </div>
        <div className="space-y-3 border-t border-gray-100 pt-4 dark:border-white/8">
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {next
              ? `${tripName(next)} is ${pluralDays(daysBetween(todayKey, next.start))} away. Anything after that?`
              : 'Nothing planned yet. Time to schedule a new trip?'}
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              trackEvent('travel_nudge_plan_click', {
                direction: nudge.direction,
                hasUpcomingTrip: next !== null,
              })
              onPlanTrip()
            }}
          >
            <CalendarPlus />
            Plan a trip
          </Button>
        </div>
      </CardContent>
    </StandardCard>
  )
}
