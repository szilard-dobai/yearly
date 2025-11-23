import type { CountryVisit } from '../lib/types'
import { getMonthData } from '../lib/calendar'
import DateCell from './DateCell'
import type { FlagDisplayMode, WeekStartsOn } from './Settings'

interface MonthGridProps {
  year: number
  month: number
  visits: CountryVisit[]
  onRemoveVisit: (visitId: string) => void
  flagDisplayMode: FlagDisplayMode
  weekStartsOn?: WeekStartsOn
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export default function MonthGrid({
  year,
  month,
  visits,
  onRemoveVisit,
  flagDisplayMode,
  weekStartsOn = 0,
}: MonthGridProps) {
  const weeks = getMonthData(year, month, weekStartsOn)

  return (
    <section
      className="space-y-1 sm:space-y-2"
      aria-labelledby={`month-${year}-${month}`}
    >
      <h3
        id={`month-${year}-${month}`}
        className="text-base sm:text-xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2"
      >
        {MONTH_NAMES[month]}
      </h3>

      <div
        className="space-y-0"
        role="grid"
        aria-label={`${MONTH_NAMES[month]} ${year} calendar`}
      >
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-0" role="row">
            {week.map((date, dayIndex) => (
              <DateCell
                key={dayIndex}
                date={date}
                visits={visits}
                onRemoveVisit={onRemoveVisit}
                flagDisplayMode={flagDisplayMode}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
