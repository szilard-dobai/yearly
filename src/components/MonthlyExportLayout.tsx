import { getCountryCodesByDay, getMonthData } from '@/lib/calendar'
import { MONTH_NAMES } from '@/lib/constants'
import type { FlagDisplayMode } from '@/lib/contexts/SettingsContext'
import {
  fitRankNameSize,
  fitStatValueSize,
  getMonthLayout,
  type ExportFormat,
} from '@/lib/export-canvas'
import { toDayKey } from '@/lib/selection'
import {
  calculateAverageTripLength,
  calculateCountriesByDays,
  calculatePercentageOfMonthTraveled,
  calculateTotalCountriesVisited,
  calculateTotalDaysTraveled,
} from '@/lib/statistics'
import type { CalendarData } from '@/lib/types'
import {
  ExportRankRow,
  ExportStatTile,
  getCountryName,
} from './export/ExportBlocks'
import { ExportDayFlags } from './export/ExportFlag'
import ExportFrame from './export/ExportFrame'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface MonthlyExportLayoutProps {
  calendarData: CalendarData
  year: number
  month: number
  format: ExportFormat
  flagDisplayMode: FlagDisplayMode
  weekStartsOn: number
}

export default function MonthlyExportLayout({
  calendarData,
  year,
  month,
  format,
  flagDisplayMode,
  weekStartsOn,
}: MonthlyExportLayoutProps) {
  const visits = calendarData.visits.filter(
    (visit) =>
      visit.date.getFullYear() === year && visit.date.getMonth() === month
  )
  const rankedCountries = calculateCountriesByDays(visits, 5)
  const layout = getMonthLayout(
    year,
    month,
    weekStartsOn,
    format,
    rankedCountries.length
  )
  const topCountries = rankedCountries.slice(0, layout.countries)
  const codesByDay = getCountryCodesByDay(visits)

  const tiles = [
    {
      label: 'Countries Visited',
      value: { value: String(calculateTotalCountriesVisited(visits)) },
    },
    {
      label: 'Days Abroad',
      value: { value: String(calculateTotalDaysTraveled(visits)) },
    },
    {
      label: 'Average Trip',
      value: {
        value: calculateAverageTripLength(visits).toFixed(1),
        unit: 'days',
      },
    },
    {
      label: 'Month Abroad',
      value: {
        value: `${calculatePercentageOfMonthTraveled(visits, year, month).toFixed(1)}%`,
      },
    },
  ]
  const valueSize = fitStatValueSize(
    tiles.map(({ value }) => ({ value, width: layout.tileContentWidth })),
    layout.tileValueSize
  )
  const nameSize = fitRankNameSize(
    topCountries.map(({ countryCode }) => getCountryName(countryCode)),
    layout.rank,
    layout.rowWidth
  )

  return (
    <ExportFrame format={format} title={`${MONTH_NAMES[month]} ${year}`}>
      <div
        className="grid grid-cols-7"
        style={{ height: layout.weekdayHeight }}
      >
        {Array.from({ length: 7 }, (_, i) => (
          <span
            key={i}
            className="text-center font-medium text-gray-500 dark:text-gray-400"
            style={{ fontSize: layout.weekdaySize }}
          >
            {DAY_LABELS[(weekStartsOn + i) % 7]}
          </span>
        ))}
      </div>

      {getMonthData(year, month, weekStartsOn).map((week, weekIndex) => (
        <div key={weekIndex} className="flex">
          {week.map((date, dayIndex) => {
            const codes = date ? codesByDay.get(toDayKey(date)) : null
            return (
              <div
                key={dayIndex}
                className="flex shrink-0 items-center justify-center"
                style={{ width: layout.dayWidth, height: layout.dayHeight }}
              >
                {date &&
                  (codes ? (
                    <ExportDayFlags
                      codes={codes}
                      size={layout.flagSize}
                      mode={flagDisplayMode}
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

      <div
        className="grid"
        style={{
          marginTop: layout.sectionGap,
          gridTemplateColumns: `repeat(${layout.tileColumns}, minmax(0, 1fr))`,
          gap: layout.tileGap,
        }}
      >
        {tiles.map((tile) => (
          <ExportStatTile
            key={tile.label}
            label={tile.label}
            value={tile.value}
            labelSize={layout.tileLabelSize}
            valueSize={valueSize}
            height={layout.tileHeight}
            padding={layout.tilePadding}
          />
        ))}
      </div>

      {layout.countries > 0 && (
        <div style={{ marginTop: layout.sectionGap }}>
          <h3
            className="font-semibold leading-none text-gray-900 dark:text-white"
            style={{
              fontSize: layout.listHeaderSize,
              height: layout.listHeaderHeight,
            }}
          >
            Top Countries
          </h3>
          <div className="flex flex-col" style={{ gap: layout.rowGap }}>
            {topCountries.map((item, index) => (
              <ExportRankRow
                key={item.countryCode}
                rank={index + 1}
                code={item.countryCode}
                days={item.days}
                sizes={layout.rank}
                nameSize={nameSize}
                flagMode={flagDisplayMode}
              />
            ))}
          </div>
        </div>
      )}
    </ExportFrame>
  )
}
