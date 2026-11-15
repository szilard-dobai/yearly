import { getCountryCodesByDay, getMonthData } from '@/lib/calendar'
import { MONTH_NAMES_SHORT } from '@/lib/constants'
import { getYearLayout, type ExportFormat } from '@/lib/export-canvas'
import { toDayKey } from '@/lib/selection'
import type { CalendarData } from '@/lib/types'
import { DayFlags } from './Emoji'
import ExportFrame from './export/ExportFrame'

interface YearExportLayoutProps {
  calendarData: CalendarData
  year: number
  format: ExportFormat
  weekStartsOn: number
}

export default function YearExportLayout({
  calendarData,
  year,
  format,
  weekStartsOn,
}: YearExportLayoutProps) {
  const layout = getYearLayout(year, weekStartsOn, format)
  const codesByDay = getCountryCodesByDay(calendarData.visits)

  return (
    <ExportFrame format={format} title={String(year)}>
      <div
        className="grid items-start"
        style={{
          gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
          columnGap: layout.columnGap,
          rowGap: layout.rowGap,
        }}
      >
        {MONTH_NAMES_SHORT.map((name, month) => (
          <section key={name}>
            <h3
              className="font-bold leading-none text-gray-900 dark:text-white"
              style={{
                height: layout.labelHeight,
                fontSize: layout.labelSize,
                paddingLeft: layout.cellWidth * 0.2,
              }}
            >
              {name}
            </h3>
            {getMonthData(year, month, weekStartsOn).map((week, weekIndex) => (
              <div key={weekIndex} className="flex">
                {week.map((date, dayIndex) => {
                  const codes = date ? codesByDay.get(toDayKey(date)) : null
                  return (
                    <div
                      key={dayIndex}
                      className="flex shrink-0 items-center justify-center"
                      style={{
                        width: layout.cellWidth,
                        height: layout.cellHeight,
                      }}
                    >
                      {date &&
                        (codes ? (
                          <DayFlags
                            codes={codes}
                            size={layout.flagSize}
                            resolution="large"
                          />
                        ) : (
                          <span
                            className="font-medium leading-none"
                            style={{ fontSize: layout.daySize }}
                          >
                            {date.getDate()}
                          </span>
                        ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </section>
        ))}
      </div>
    </ExportFrame>
  )
}
