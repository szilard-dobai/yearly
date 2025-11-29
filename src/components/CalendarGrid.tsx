'use client'

import type { CalendarData } from '@/lib/types'
import { forwardRef } from 'react'
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
      <div ref={ref} data-export-target="calendar">
        <div className="mb-4 border-b border-gray-200 dark:border-white/10 pb-4">
          <h2 className="text-4xl sm:text-6xl font-bold text-red-500">
            {year}
          </h2>
        </div>
        <div className="grid grid-cols-1 min-[25rem]:grid-cols-2 lg:grid-cols-3 gap-x-4 min-[25rem]:gap-x-6 lg:gap-x-8 gap-y-4 min-[25rem]:gap-y-6">
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
