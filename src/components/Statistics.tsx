import { useMemo, type RefObject } from 'react'
import type { CalendarData } from '../lib/types'
import {
  calculateTotalCountriesVisited,
  calculateTotalDaysTraveled,
  calculateCountriesByDays,
  calculateAverageDaysPerCountry,
  calculateBusiestMonth,
  calculatePercentageOfYearTraveled,
} from '../lib/statistics'
import StatisticsCard from './StatisticsCard'
import StatisticsExportLayout from './StatisticsExportLayout'
import CountryRankingList, {
  type CountryRankingItem,
} from './CountryRankingList'

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

interface StatisticsProps {
  calendarData: CalendarData
  year?: number
  exportRef?: RefObject<HTMLDivElement | null>
}

export default function Statistics({
  calendarData,
  year,
  exportRef,
}: StatisticsProps) {
  const currentYear = year ?? new Date().getFullYear()

  const visits = useMemo(
    () =>
      year
        ? calendarData.visits.filter(
            (visit) => visit.date.getFullYear() === year
          )
        : calendarData.visits,
    [calendarData.visits, year]
  )

  const stats = useMemo(() => {
    const totalCountries = calculateTotalCountriesVisited(visits)
    const totalDays = calculateTotalDaysTraveled(visits)
    const averageDays = calculateAverageDaysPerCountry(visits)
    const countriesByDays = calculateCountriesByDays(visits, 5)
    const busiestMonth = calculateBusiestMonth(visits, currentYear)
    const percentTraveled = calculatePercentageOfYearTraveled(
      visits,
      currentYear
    )

    return {
      totalCountries,
      totalDays,
      averageDays,
      countriesByDays,
      busiestMonth,
      percentTraveled,
    }
  }, [visits, currentYear])

  const rankingItems: CountryRankingItem[] = useMemo(
    () =>
      stats.countriesByDays.map((item, index) => ({
        countryCode: item.countryCode,
        days: item.days,
        rank: index + 1,
      })),
    [stats.countriesByDays]
  )

  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3">
          <StatisticsCard
            title="Countries Visited"
            value={stats.totalCountries}
            subtitle={stats.totalCountries === 1 ? 'country' : 'countries'}
          />

          <StatisticsCard
            title="Days Abroad"
            value={stats.totalDays}
            subtitle={stats.totalDays === 1 ? 'day' : 'days'}
          />

          {stats.totalCountries > 0 && (
            <StatisticsCard
              title="Average Stay"
              value={stats.averageDays.toFixed(1)}
              subtitle="days per country"
            />
          )}

          {stats.busiestMonth && (
            <StatisticsCard
              title="Busiest Month"
              value={MONTH_NAMES[stats.busiestMonth.month]}
              subtitle={`${stats.busiestMonth.days} ${stats.busiestMonth.days === 1 ? 'day' : 'days'}`}
            />
          )}

          {stats.totalDays > 0 && (
            <StatisticsCard
              title="Year Abroad"
              value={`${stats.percentTraveled.toFixed(1)}%`}
              subtitle="of the year"
            />
          )}
        </div>

        {stats.countriesByDays.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3 text-gray-900 dark:text-white">
              Top Countries by Days
            </h3>
            <CountryRankingList items={rankingItems} maxItems={5} />
          </div>
        )}

        {stats.totalDays === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm">No visits recorded yet</p>
            <p className="text-xs mt-1">
              Add your first country visit to see statistics
            </p>
          </div>
        )}
      </div>
      {exportRef && (
        <div className="sr-only" aria-hidden="true">
          <StatisticsExportLayout
            ref={exportRef}
            calendarData={calendarData}
            year={currentYear}
          />
        </div>
      )}
    </>
  )
}
