import { MONTH_NAMES } from '@/lib/constants'
import type { FlagDisplayMode } from '@/lib/contexts/SettingsContext'
import {
  fitRankNameSize,
  fitStatValueSize,
  getStatsLayout,
  STATS_MAX_COUNTRIES,
  type ExportFormat,
} from '@/lib/export-canvas'
import {
  calculateAverageTripLength,
  calculateBusiestMonth,
  calculateCountriesByDays,
  calculatePercentageOfYearTraveled,
  calculateTotalCountriesVisited,
  calculateTotalDaysTraveled,
} from '@/lib/statistics'
import type { CalendarData } from '@/lib/types'
import {
  ExportRankRow,
  ExportStatTile,
  getCountryName,
} from './export/ExportBlocks'
import ExportFrame from './export/ExportFrame'

interface StatisticsExportLayoutProps {
  calendarData: CalendarData
  year: number
  format: ExportFormat
  flagDisplayMode: FlagDisplayMode
}

export default function StatisticsExportLayout({
  calendarData,
  year,
  format,
  flagDisplayMode,
}: StatisticsExportLayoutProps) {
  const visits = calendarData.visits.filter(
    (visit) => visit.date.getFullYear() === year
  )
  const topCountries = calculateCountriesByDays(visits, STATS_MAX_COUNTRIES)
  const busiestMonth = calculateBusiestMonth(visits, year)
  const layout = getStatsLayout(format, topCountries.length)

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
      label: 'Year Abroad',
      value: {
        value: `${calculatePercentageOfYearTraveled(visits, year).toFixed(1)}%`,
      },
    },
    {
      label: 'Busiest Month',
      value: busiestMonth
        ? {
            value: MONTH_NAMES[busiestMonth.month],
            unit: `${busiestMonth.days} ${busiestMonth.days === 1 ? 'day' : 'days'}`,
          }
        : { value: '–' },
      wide: true,
    },
  ]
  const valueSize = fitStatValueSize(
    tiles.map(({ value, wide }) => ({
      value,
      width: wide ? layout.wideTileContentWidth : layout.tileContentWidth,
    })),
    layout.tileValueSize
  )
  const nameSize = fitRankNameSize(
    topCountries.map(({ countryCode }) => getCountryName(countryCode)),
    layout.rank,
    layout.rowWidth
  )

  return (
    <ExportFrame format={format} title={String(year)}>
      <div className="grid grid-cols-2" style={{ gap: layout.tileGap }}>
        {tiles.map((tile) => (
          <ExportStatTile
            key={tile.label}
            label={tile.label}
            value={tile.value}
            labelSize={layout.tileLabelSize}
            valueSize={valueSize}
            height={layout.tileHeight}
            padding={layout.tilePadding}
            className={tile.wide ? 'col-span-2' : undefined}
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
