import { memo } from 'react'
import type { CountryVisit } from '../lib/types'
import { getVisitsForDate, isToday } from '../lib/calendar'
import { getCountryByCode } from '../lib/countries'
import type { FlagDisplayMode } from './Settings'
import * as FlagIcons from 'country-flag-icons/react/3x2'

interface DateCellProps {
  date: Date | null
  visits: CountryVisit[]
  onRemoveVisit: (visitId: string) => void
  flagDisplayMode: FlagDisplayMode
}

function DateCell({ date, visits, onRemoveVisit, flagDisplayMode }: DateCellProps) {
  if (!date) {
    return <div className="aspect-square p-1" role="gridcell" aria-hidden="true" />
  }

  const cellVisits = getVisitsForDate(date, visits)
  const today = isToday(date)
  const dayNumber = date.getDate()
  const hasVisits = cellVisits.length > 0

  const dateLabel = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })

  // Convert country code to flag emoji
  const getFlagEmoji = (countryCode: string) => {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
  }

  // Get flag icon component
  const getFlagIcon = (countryCode: string) => {
    const code = countryCode.toUpperCase()
    const FlagComponent = FlagIcons[code as keyof typeof FlagIcons]
    if (!FlagComponent) return null
    return <FlagComponent className="w-6 h-4 sm:w-8 sm:h-6" />
  }

  const renderFlag = (countryCode: string) => {
    if (flagDisplayMode === 'icon') {
      return getFlagIcon(countryCode)
    }
    return <div className="text-lg sm:text-2xl leading-none">{getFlagEmoji(countryCode)}</div>
  }

  const hasTwoCountries = cellVisits.length === 2
  const allCountries = cellVisits.map(v => getCountryByCode(v.countryCode)?.name || v.countryCode).join(', ')

  return (
    <div
      className="aspect-square p-0.5 sm:p-1 flex items-center justify-center group relative"
      role="gridcell"
      aria-label={hasVisits ? `${dateLabel}, visited ${allCountries}` : `${dateLabel}, no visits`}
    >
      <div className="relative flex flex-col items-center justify-center w-full h-full">
        {hasVisits ? (
          <>
            {hasTwoCountries ? (
              // Two countries: diagonal split like ½ symbol
              <div className="relative w-full h-full">
                {/* Top-left half (first country) */}
                <div
                  className="absolute inset-0 flex items-center justify-center overflow-hidden"
                  style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
                >
                  {flagDisplayMode === 'icon' ? (
                    getFlagIcon(cellVisits[0].countryCode)
                  ) : (
                    <div className="w-6 h-4 sm:w-8 sm:h-6 flex items-center justify-center text-lg sm:text-xl leading-none">{getFlagEmoji(cellVisits[0].countryCode)}</div>
                  )}
                </div>
                {/* Bottom-right half (second country) */}
                <div
                  className="absolute inset-0 flex items-center justify-center overflow-hidden"
                  style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                >
                  {flagDisplayMode === 'icon' ? (
                    getFlagIcon(cellVisits[1].countryCode)
                  ) : (
                    <div className="w-6 h-4 sm:w-8 sm:h-6 flex items-center justify-center text-lg sm:text-xl leading-none">{getFlagEmoji(cellVisits[1].countryCode)}</div>
                  )}
                </div>
              </div>
            ) : (
              // Single country: centered
              renderFlag(cellVisits[0].countryCode)
            )}
            <button
              onClick={() => {
                // Remove all visits for this date
                cellVisits.forEach(visit => onRemoveVisit(visit.id))
              }}
              className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-red-600/90 rounded flex items-center justify-center text-white text-xs font-bold cursor-pointer transition-opacity"
              aria-label={`Remove visits: ${allCountries}`}
            >
              ×
            </button>
          </>
        ) : (
          <span className={`text-[10px] sm:text-xs font-medium ${today ? 'text-red-500 font-bold' : 'text-gray-900 dark:text-white'}`}>
            {dayNumber}
          </span>
        )}
      </div>
    </div>
  )
}

export default memo(DateCell)
