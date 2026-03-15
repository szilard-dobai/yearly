'use client'

import { forwardRef, useMemo } from 'react'
import type { CalendarData } from '@/lib/types'
import { getCountryByCode } from '@/lib/countries'
import { getMonthData, getVisitsForDate } from '@/lib/calendar'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { MONTH_NAMES } from '@/lib/constants'
import Flag from './Flag'
import {
  calculateTotalCountriesVisited,
  calculateTotalDaysTraveled,
  calculateCountriesByDays,
  calculateAverageTripLength,
  calculatePercentageOfMonthTraveled,
} from '@/lib/statistics'

interface MonthlyExportLayoutProps {
  calendarData: CalendarData
  year: number
  month: number
}

const MonthlyExportLayout = forwardRef<
  HTMLDivElement,
  MonthlyExportLayoutProps
>(({ calendarData, year, month }, ref) => {
  const { settings } = useSettings()

  const monthVisits = useMemo(
    () =>
      calendarData.visits.filter(
        (visit) =>
          visit.date.getFullYear() === year && visit.date.getMonth() === month
      ),
    [calendarData.visits, year, month]
  )

  const weeks = useMemo(
    () => getMonthData(year, month, settings.weekStartsOn),
    [year, month, settings.weekStartsOn]
  )

  const stats = useMemo(() => {
    const totalCountries = calculateTotalCountriesVisited(monthVisits)
    const totalDays = calculateTotalDaysTraveled(monthVisits)
    const averageTripLength = calculateAverageTripLength(monthVisits)
    const countriesByDays = calculateCountriesByDays(monthVisits, 5)
    const percentTraveled = calculatePercentageOfMonthTraveled(
      monthVisits,
      year,
      month
    )

    return {
      totalCountries,
      totalDays,
      averageTripLength,
      countriesByDays,
      percentTraveled,
    }
  }, [monthVisits, year, month])

  const dayLabels = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const reordered = []
    for (let i = 0; i < 7; i++) {
      reordered.push(days[(settings.weekStartsOn + i) % 7])
    }
    return reordered
  }, [settings.weekStartsOn])

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
      data-export-target="monthly"
      className="flex flex-col min-h-full"
    >
      <div className="mb-4 border-b border-gray-200 dark:border-white/10 pb-6">
        <h2 className="text-4xl font-bold text-red-500">
          {MONTH_NAMES[month]} {year}
        </h2>
      </div>

      <div className="mb-16">
        <div className="grid grid-cols-7 gap-0 mb-1">
          {dayLabels.map((day) => (
            <div
              key={day}
              className="text-center text-sm text-gray-500 dark:text-gray-400 font-medium py-1"
            >
              {day}
            </div>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-0">
            {week.map((date, dayIndex) => {
              if (!date) {
                return <div key={dayIndex} className="h-20 p-1" />
              }

              const cellVisits = getVisitsForDate(date, monthVisits)
              const hasVisits = cellVisits.length > 0
              const hasTwoCountries = cellVisits.length === 2

              return (
                <div
                  key={dayIndex}
                  className="h-20 p-0.5 flex items-center justify-center"
                >
                  <div className="flex items-center justify-center w-full h-full">
                    {hasVisits ? (
                      hasTwoCountries ? (
                        <div className="relative w-10 h-8">
                          <div
                            className="absolute inset-0 flex items-center justify-center overflow-hidden"
                            style={{
                              clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                            }}
                          >
                            <Flag
                              countryCode={cellVisits[0].countryCode}
                              displayMode={settings.flagDisplayMode}
                              size="lg"
                              className="text-3xl"
                            />
                          </div>
                          <div
                            className="absolute inset-0 flex items-center justify-center overflow-hidden"
                            style={{
                              clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                            }}
                          >
                            <Flag
                              countryCode={cellVisits[1].countryCode}
                              displayMode={settings.flagDisplayMode}
                              size="lg"
                              className="text-3xl"
                            />
                          </div>
                        </div>
                      ) : (
                        <Flag
                          displayMode={settings.flagDisplayMode}
                          countryCode={cellVisits[0].countryCode}
                          size="lg"
                          className="text-3xl"
                        />
                      )
                    ) : (
                      <span className="text-lg font-medium text-gray-900 dark:text-white">
                        {date.getDate()}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="stat-card p-3 rounded-2xl border bg-gray-100 dark:bg-white/5">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Countries Visited
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalCountries}
          </p>
        </div>

        <div className="stat-card p-3 rounded-2xl border bg-gray-100 dark:bg-white/5">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Days Abroad
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalDays}
          </p>
        </div>

        <div className="stat-card p-3 rounded-2xl border bg-gray-100 dark:bg-white/5">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Average Trip
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.averageTripLength.toFixed(1)}
            <span className="text-base font-normal text-gray-500 dark:text-gray-400 ml-1">
              days
            </span>
          </p>
        </div>

        <div className="stat-card p-3 rounded-2xl border bg-gray-100 dark:bg-white/5">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Month Abroad
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.percentTraveled.toFixed(1)}%
          </p>
        </div>
      </div>

      {stats.countriesByDays.length > 0 && (
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
            Top Countries
          </h3>
          <div className="space-y-2">
            {stats.countriesByDays.map((item, index) => {
              const country = getCountryByCode(item.countryCode)
              const countryName = country?.name || item.countryCode

              return (
                <div
                  key={item.countryCode}
                  className="flex items-center gap-4 p-3 border rounded-2xl bg-gray-100 dark:bg-white/5"
                >
                  <div className="w-10 flex items-center justify-center shrink-0">
                    {getRankDisplay(index + 1)}
                  </div>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-8 h-6 flex items-center shrink-0">
                      <Flag
                        countryCode={item.countryCode}
                        displayMode={settings.flagDisplayMode}
                        className="text-2xl"
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

MonthlyExportLayout.displayName = 'MonthlyExportLayout'

export default MonthlyExportLayout
