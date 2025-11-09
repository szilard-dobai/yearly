import type { CountryVisit } from '../lib/types'
import { getMonthData } from '../lib/calendar'
import DateCell from './DateCell'

interface MonthGridProps {
  year: number
  month: number
  visits: CountryVisit[]
  onRemoveVisit: (visitId: string) => void
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function MonthGrid({
  year,
  month,
  visits,
  onRemoveVisit,
}: MonthGridProps) {
  const weeks = getMonthData(year, month)

  return (
    <section
      className="space-y-2"
      aria-labelledby={`month-${year}-${month}`}
    >
      <h3
        id={`month-${year}-${month}`}
        className="text-sm font-medium text-gray-900 dark:text-white"
      >
        {MONTH_NAMES[month]} {year}
      </h3>

      <div
        className="space-y-1"
        role="grid"
        aria-label={`${MONTH_NAMES[month]} ${year} calendar`}
      >
        <div className="grid grid-cols-7 gap-1 mb-2" role="row">
          {DAY_NAMES.map((day) => (
            <div
              key={day}
              role="columnheader"
              className="text-center text-xs font-medium text-gray-500 dark:text-gray-400"
            >
              {day}
            </div>
          ))}
        </div>

        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1" role="row">
            {week.map((date, dayIndex) => (
              <DateCell
                key={dayIndex}
                date={date}
                visits={visits}
                onRemoveVisit={onRemoveVisit}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
