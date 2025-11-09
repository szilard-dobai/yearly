'use client'

import type { CalendarData } from '../lib/types'
import MonthGrid from './MonthGrid'

interface CalendarGridProps {
  year: number
  calendarData: CalendarData
  onRemoveVisit: (visitId: string) => void
}

export default function CalendarGrid({
  year,
  calendarData,
  onRemoveVisit,
}: CalendarGridProps) {
  const visits = calendarData.visits

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {Array.from({ length: 12 }, (_, month) => (
          <MonthGrid
            key={month}
            year={year}
            month={month}
            visits={visits}
            onRemoveVisit={onRemoveVisit}
          />
        ))}
      </div>
    </div>
  )
}
