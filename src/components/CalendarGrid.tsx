'use client'

import type { CalendarData } from '@/lib/types'
import { forwardRef } from 'react'
import MonthGrid from './MonthGrid'
import type { FlagDisplayMode, WeekStartsOn } from './Settings'

interface CalendarGridProps {
  year: number
  calendarData: CalendarData
  onRemoveVisit: (visitId: string) => void
  flagDisplayMode: FlagDisplayMode
  weekStartsOn?: WeekStartsOn
}

const CalendarGrid = forwardRef<HTMLDivElement, CalendarGridProps>(
  (
    { year, calendarData, onRemoveVisit, flagDisplayMode, weekStartsOn },
    ref
  ) => {
    const visits = calendarData.visits

    return (
      <div
        ref={ref}
        className="space-y-6 bg-white dark:bg-zinc-900 p-4 sm:p-6"
        data-export-target="calendar"
      >
        <div className="mb-4 border-b pb-4">
          <h2 className="text-4xl sm:text-6xl font-bold text-red-500">
            {year}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-6 lg:gap-x-8 gap-y-4 sm:gap-y-6">
          {Array.from({ length: 12 }, (_, month) => (
            <MonthGrid
              key={month}
              year={year}
              month={month}
              visits={visits}
              onRemoveVisit={onRemoveVisit}
              flagDisplayMode={flagDisplayMode}
              weekStartsOn={weekStartsOn}
            />
          ))}
        </div>
      </div>
    )
  }
)

CalendarGrid.displayName = 'CalendarGrid'

export default CalendarGrid
