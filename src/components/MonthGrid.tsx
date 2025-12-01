import type { CountryVisit } from '../lib/types'
import { getMonthData } from '../lib/calendar'
import { MONTH_NAMES_SHORT } from '../lib/constants'
import { useSettings } from '@/lib/contexts/SettingsContext'
import DateCell from './DateCell'

interface MonthGridProps {
  year: number
  month: number
  visits: CountryVisit[]
  onRemoveVisit: (visitId: string) => void
}

export default function MonthGrid({
  year,
  month,
  visits,
  onRemoveVisit,
}: MonthGridProps) {
  const { settings } = useSettings()
  const weeks = getMonthData(year, month, settings.weekStartsOn)

  return (
    <section
      className="space-y-1 sm:space-y-2"
      aria-labelledby={`month-${year}-${month}`}
    >
      <h3
        id={`month-${year}-${month}`}
        className="text-base sm:text-xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2 ps-1 sm:ps-3 lg:ps-4"
      >
        {MONTH_NAMES_SHORT[month]}
      </h3>

      <div
        className="space-y-0"
        role="grid"
        aria-label={`${MONTH_NAMES_SHORT[month]} ${year} calendar`}
      >
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-0" role="row">
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
