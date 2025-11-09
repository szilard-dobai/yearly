'use client'

import { forwardRef } from 'react'
import type { CalendarData } from '../lib/types'
import MonthGrid from './MonthGrid'

interface CalendarGridProps {
  year: number
  calendarData: CalendarData
  onRemoveVisit: (visitId: string) => void
}

const CalendarGrid = forwardRef<HTMLDivElement, CalendarGridProps>(
  ({ year, calendarData, onRemoveVisit }, ref) => {
    const visits = calendarData.visits

    return (
      <div ref={ref} className="space-y-8" data-export-target="calendar">
        <div className="mb-6">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white">
            {year}
          </h2>
        </div>
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
)

CalendarGrid.displayName = 'CalendarGrid'

export default CalendarGrid
