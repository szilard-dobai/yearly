'use client'

import { forwardRef, useMemo } from 'react'
import type { CalendarData } from '@/lib/types'
import { getCountryByCode } from '@/lib/countries'
import { useSettings } from '@/lib/contexts/SettingsContext'
import Flag from './Flag'
import {
  calculateTotalCountriesVisited,
  calculateTotalDaysTraveled,
  calculateCountriesByDays,
  calculateAverageDaysPerCountry,
  calculateBusiestMonth,
  calculatePercentageOfYearTraveled,
} from '@/lib/statistics'

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

interface StatisticsExportCardProps {
  calendarData: CalendarData
  year: number
}

const StatisticsExportCard = forwardRef<
  HTMLDivElement,
  StatisticsExportCardProps
>(({ calendarData, year }, ref) => {
  const { settings } = useSettings()

  const visits = useMemo(
    () =>
      calendarData.visits.filter((visit) => visit.date.getFullYear() === year),
    [calendarData.visits, year]
  )

  const stats = useMemo(() => {
    const totalCountries = calculateTotalCountriesVisited(visits)
    const totalDays = calculateTotalDaysTraveled(visits)
    const averageDays = calculateAverageDaysPerCountry(visits)
    const countriesByDays = calculateCountriesByDays(visits, 5)
    const busiestMonth = calculateBusiestMonth(visits, year)
    const percentTraveled = calculatePercentageOfYearTraveled(visits, year)

    return {
      totalCountries,
      totalDays,
      averageDays,
      countriesByDays,
      busiestMonth,
      percentTraveled,
    }
  }, [visits, year])

  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return <span className="text-2xl leading-none">🥇</span>
      case 2:
        return <span className="text-2xl leading-none">🥈</span>
      case 3:
        return <span className="text-2xl leading-none">🥉</span>
      default:
        return (
          <span className="text-xl font-semibold text-gray-500 dark:text-gray-400">
            {rank}.
          </span>
        )
    }
  }

  return (
    <div
      ref={ref}
      data-export-target="statistics"
      className="flex flex-col min-h-full"
    >
      <div className="mb-4 border-b border-gray-200 dark:border-white/10 pb-6">
        <h2 className="text-4xl font-bold text-red-500">{year}</h2>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="stat-card p-5 rounded-2xl border bg-gray-100 dark:bg-white/5">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Countries Visited
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.totalCountries}
          </p>
        </div>

        <div className="stat-card p-5 rounded-2xl border bg-gray-100 dark:bg-white/5">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Days Abroad
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.totalDays}
          </p>
        </div>

        <div className="stat-card p-5 rounded-2xl border bg-gray-100 dark:bg-white/5">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Average Stay
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.averageDays.toFixed(1)}
            <span className="text-lg font-normal text-gray-500 dark:text-gray-400 ml-1">
              days
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.busiestMonth && (
          <div className="stat-card p-5 rounded-2xl border bg-gray-100 dark:bg-white/5">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Busiest Month
            </p>
            <p className="text-3xl leading-tight font-bold text-gray-900 dark:text-white">
              {MONTH_NAMES[8]}
            </p>
            <p className="text-lg text-gray-500 dark:text-gray-400">
              {stats.busiestMonth.days} days
            </p>
          </div>
        )}

        {stats.totalDays > 0 && (
          <div className="stat-card p-5 rounded-2xl border bg-gray-100 dark:bg-white/5">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Year Abroad
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.percentTraveled.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      {stats.countriesByDays.length > 0 && (
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Top Countries
          </h3>
          <div className="space-y-3">
            {stats.countriesByDays.map((item, index) => {
              const country = getCountryByCode(item.countryCode)
              const countryName = country?.name || item.countryCode

              return (
                <div
                  key={item.countryCode}
                  className="flex items-center gap-4 p-4 border rounded-2xl bg-gray-100 dark:bg-white/5"
                >
                  <div className="w-10 flex items-center justify-center shrink-0">
                    {getRankDisplay(index + 1)}
                  </div>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-8 h-6 flex items-center shrink-0">
                      <Flag
                        countryCode={item.countryCode}
                        displayMode={settings.flagDisplayMode}
                        className='text-2xl'
                        size="lg"
                      />
                    </div>
                    <span className="text-xl font-medium text-gray-900 dark:text-white truncate">
                      {countryName}
                    </span>
                  </div>
                  <span className="px-3 py-1.5 rounded-full bg-gray-200 dark:bg-white/10 text-base font-medium text-gray-600 dark:text-gray-300 shrink-0">
                    {item.days} {item.days === 1 ? 'day' : 'days'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div
        data-export-watermark
        className="hidden mt-6 pt-4 border-t border-gray-200 dark:border-white/10"
      >
        <p className="text-center text-gray-400 dark:text-gray-500 tracking-wide">
          made with <span className="font-medium">yearly.world</span>
        </p>
      </div>
    </div>
  )
})

StatisticsExportCard.displayName = 'StatisticsExportCard'

export default StatisticsExportCard
