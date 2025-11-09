'use client'

import { forwardRef } from 'react'
import type { CalendarData } from '../lib/types'
import MonthGrid from './MonthGrid'
import type { FlagDisplayMode } from './Settings'

interface CalendarGridProps {
  year: number
  calendarData: CalendarData
  onRemoveVisit: (visitId: string) => void
  flagDisplayMode: FlagDisplayMode
}

const CalendarGrid = forwardRef<HTMLDivElement, CalendarGridProps>(
  ({ year, calendarData, onRemoveVisit, flagDisplayMode }, ref) => {
    const visits = calendarData.visits

    return (
      <div ref={ref} className="space-y-6 bg-white dark:bg-zinc-900 p-6" data-export-target="calendar">
        <div className="mb-4">
          <h2 className="text-6xl font-bold text-red-500">
            {year}
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-x-8 gap-y-6">
          {Array.from({ length: 12 }, (_, month) => (
            <MonthGrid
              key={month}
              year={year}
              month={month}
              visits={visits}
              onRemoveVisit={onRemoveVisit}
              flagDisplayMode={flagDisplayMode}
            />
          ))}
        </div>
      </div>
    )
  }
)

CalendarGrid.displayName = 'CalendarGrid'

export default CalendarGrid
