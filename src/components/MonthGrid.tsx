import type { CountryVisit } from '../lib/types'
import { getMonthData } from '../lib/calendar'
import { MONTH_NAMES, MONTH_NAMES_SHORT } from '../lib/constants'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { toDayKey } from '@/lib/selection'
import DateCell from './DateCell'
import { Download } from 'lucide-react'

interface MonthGridProps {
  year: number
  month: number
  visits: CountryVisit[]
  selectionStartKey?: string | null
  selectionEndKey?: string | null
  focusKey?: string | null
  onSelectMonth?: () => void
  onExport?: () => void
}

export default function MonthGrid({
  year,
  month,
  visits,
  selectionStartKey = null,
  selectionEndKey = null,
  focusKey = null,
  onSelectMonth,
  onExport,
}: MonthGridProps) {
  const { settings } = useSettings()
  const weeks = getMonthData(year, month, settings.weekStartsOn)

  return (
    <section
      className="space-y-1 sm:space-y-2"
      aria-labelledby={`month-${year}-${month}`}
    >
      <div className="flex items-center gap-1 group/month-header">
        <h3
          id={`month-${year}-${month}`}
          className="text-base sm:text-xl font-bold text-gray-900 dark:text-zinc-100 mb-1 sm:mb-2 ps-1 sm:ps-3 lg:ps-4"
        >
          {onSelectMonth ? (
            <button
              type="button"
              onClick={onSelectMonth}
              className="cursor-pointer rounded-sm outline-none transition-colors hover:text-red-500 focus-visible:ring-2 focus-visible:ring-red-500/60"
              aria-label={`Select all of ${MONTH_NAMES[month]}`}
            >
              {MONTH_NAMES_SHORT[month]}
            </button>
          ) : (
            MONTH_NAMES_SHORT[month]
          )}
        </h3>
        {onExport && (
          <button
            onClick={onExport}
            className="hidden sm:flex opacity-0 group-hover/month-header:opacity-100 transition-opacity items-center justify-center size-5 sm:size-6 rounded text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer mb-1 sm:mb-2"
            aria-label={`Download ${MONTH_NAMES_SHORT[month]} as image`}
          >
            <Download className="size-3 sm:size-4" />
          </button>
        )}
      </div>

      <div
        className="space-y-0"
        role="grid"
        aria-label={`${MONTH_NAMES_SHORT[month]} ${year} calendar`}
      >
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-0" role="row">
            {week.map((date, dayIndex) => {
              const key = date ? toDayKey(date) : null
              const selected =
                key !== null &&
                selectionStartKey !== null &&
                selectionEndKey !== null &&
                key >= selectionStartKey &&
                key <= selectionEndKey
              const isStart = selected && key === selectionStartKey
              const isEnd = selected && key === selectionEndKey
              return (
                <DateCell
                  key={dayIndex}
                  date={date}
                  visits={visits}
                  selected={selected}
                  selectionEdge={isStart || isEnd}
                  roundStart={
                    isStart || dayIndex === 0 || week[dayIndex - 1] === null
                  }
                  roundEnd={
                    isEnd || dayIndex === 6 || week[dayIndex + 1] === null
                  }
                  tabbable={key !== null && key === focusKey}
                />
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
