'use client'

import { memo } from 'react'
import { getVisitsForDate, isToday } from '../lib/calendar'
import { getCountryByCode } from '../lib/countries'
import { useSettings } from '@/lib/contexts/SettingsContext'
import type { CountryVisit } from '../lib/types'
import Flag from './Flag'

interface DateCellProps {
  date: Date | null
  visits: CountryVisit[]
  onRemoveVisit: (visitId: string) => void
}

function DateCell({ date, visits, onRemoveVisit }: DateCellProps) {
  const { settings } = useSettings()
  if (!date) {
    return (
      <div className="aspect-square p-1" role="gridcell" aria-hidden="true" />
    )
  }

  const cellVisits = getVisitsForDate(date, visits)
  const dayNumber = date.getDate()
  const hasVisits = cellVisits.length > 0

  const dateLabel = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })

  const showTodayHighlight = settings.highlightToday && isToday(date)

  const hasTwoCountries = cellVisits.length === 2
  const allCountries = cellVisits
    .map((v) => getCountryByCode(v.countryCode)?.name || v.countryCode)
    .join(', ')

  return (
    <div
      className="aspect-square p-0.5 sm:p-1 flex items-center justify-center group relative"
      role="gridcell"
      aria-label={
        hasVisits
          ? `${dateLabel}, visited ${allCountries}`
          : `${dateLabel}, no visits`
      }
    >
      <div className="relative flex flex-col items-center justify-center w-full h-full">
        {hasVisits ? (
          <>
            {hasTwoCountries ? (
              // Two countries: diagonal split like ½ symbol
              <div className="relative w-6 h-4 sm:w-8 sm:h-6">
                <div
                  className="absolute inset-0 flex items-center justify-center overflow-hidden"
                  style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
                >
                  <Flag
                    countryCode={cellVisits[0].countryCode}
                    displayMode={settings.flagDisplayMode}
                  />
                </div>
                <div
                  className="absolute inset-0 flex items-center justify-center overflow-hidden"
                  style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                >
                  <Flag
                    countryCode={cellVisits[1].countryCode}
                    displayMode={settings.flagDisplayMode}
                  />
                </div>
              </div>
            ) : (
              // Single country: centered
              <Flag
                displayMode={settings.flagDisplayMode}
                countryCode={cellVisits[0].countryCode}
              />
            )}
            <button
              onClick={() => {
                cellVisits.forEach((visit) => onRemoveVisit(visit.id))
              }}
              className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-red-600/90 rounded flex items-center justify-center text-white text-xs font-bold cursor-pointer transition-opacity"
              aria-label={`Remove visits: ${allCountries}`}
            >
              ×
            </button>
          </>
        ) : (
          <span
            className={`text-[10px] sm:text-sm font-medium ${showTodayHighlight ? 'text-red-500 font-bold' : 'text-gray-900 dark:text-white'}`}
          >
            {dayNumber}
          </span>
        )}
      </div>
    </div>
  )
}

export default memo(DateCell)
