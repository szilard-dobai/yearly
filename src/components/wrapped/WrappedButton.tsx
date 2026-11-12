'use client'

import { Button } from '@/components/ui/button'
import type { Badge } from '@/lib/badges'
import { trackEvent } from '@/lib/tracking'
import { getTrips } from '@/lib/trips'
import type { CalendarData } from '@/lib/types'
import { summarizeYear } from '@/lib/year-summary'
import { Play } from 'lucide-react'
import { useMemo, useState } from 'react'
import WrappedStory from './WrappedStory'

interface WrappedButtonProps {
  calendarData: CalendarData
  year: number
  badges: Badge[]
  onDownloadCalendar: () => void
}

export default function WrappedButton({
  calendarData,
  year,
  badges,
  onDownloadCalendar,
}: WrappedButtonProps) {
  const [open, setOpen] = useState(false)
  const { dayMap, summary } = useMemo(() => {
    const { dayMap, trips } = getTrips(calendarData.visits)
    return { dayMap, summary: summarizeYear(dayMap, trips, year) }
  }, [calendarData.visits, year])

  if (summary.days === 0) return null

  return (
    <>
      <Button
        size="lg"
        onClick={() => {
          trackEvent('wrapped_open', {
            year,
            countryCount: summary.countries.length,
          })
          setOpen(true)
        }}
        className="relative w-full overflow-hidden bg-linear-to-r from-amber-300 to-orange-400 text-black hover:opacity-90 motion-safe:after:absolute motion-safe:after:inset-y-0 motion-safe:after:left-0 motion-safe:after:w-1/4 motion-safe:after:animate-sheen motion-safe:after:bg-white/30"
      >
        <Play className="size-5 fill-current" />
        Play your {year} story
      </Button>
      <WrappedStory
        open={open}
        onClose={() => setOpen(false)}
        summary={summary}
        dayMap={dayMap}
        badges={badges}
        onDownloadCalendar={onDownloadCalendar}
      />
    </>
  )
}
