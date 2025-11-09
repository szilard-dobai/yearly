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

  const country = cellVisits[0] ? getCountryByCode(cellVisits[0].countryCode) : null
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
    return <FlagComponent className="w-8 h-6" />
  }

  const renderFlag = (countryCode: string) => {
    if (flagDisplayMode === 'icon') {
      return getFlagIcon(countryCode)
    }
    return <div className="text-2xl leading-none">{getFlagEmoji(countryCode)}</div>
  }

  return (
    <div
      className="aspect-square p-1 flex items-center justify-center group relative"
      role="gridcell"
      aria-label={hasVisits ? `${dateLabel}, visited ${country?.name || cellVisits[0].countryCode}` : `${dateLabel}, no visits`}
    >
      <div className="relative flex flex-col items-center justify-center w-full h-full">
        {hasVisits ? (
          <>
            {renderFlag(cellVisits[0].countryCode)}
            <button
              onClick={() => onRemoveVisit(cellVisits[0].id)}
              className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-red-600/90 rounded flex items-center justify-center text-white text-xs font-bold cursor-pointer transition-opacity"
              aria-label={`Remove ${country?.name || cellVisits[0].countryCode} visit`}
            >
              ×
            </button>
          </>
        ) : (
          <span className={`text-xs font-medium ${today ? 'text-red-500 font-bold' : 'text-gray-900 dark:text-white'}`}>
            {dayNumber}
          </span>
        )}
      </div>
    </div>
  )
}

export default memo(DateCell)
