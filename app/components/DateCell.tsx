import type { CountryVisit } from '../lib/types'
import { getVisitsForDate, isToday } from '../lib/calendar'
import { getCountryByCode } from '../lib/countries'

interface DateCellProps {
  date: Date | null
  visits: CountryVisit[]
}

export default function DateCell({ date, visits }: DateCellProps) {
  if (!date) {
    return <div className="aspect-square" role="gridcell" aria-hidden="true" />
  }

  const cellVisits = getVisitsForDate(date, visits)
  const today = isToday(date)
  const dayNumber = date.getDate()

  const baseClasses =
    'aspect-square flex items-center justify-center border border-gray-200 dark:border-gray-800 rounded-lg transition-colors'
  const todayClasses = today
    ? 'ring-2 ring-blue-500 dark:ring-blue-400'
    : ''

  if (cellVisits.length === 0) {
    return (
      <div
        className={`${baseClasses} ${todayClasses}`}
        role="gridcell"
        aria-label={`${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}, no visits`}
      >
        <span className="text-sm text-gray-400 dark:text-gray-600">
          {dayNumber}
        </span>
      </div>
    )
  }

  if (cellVisits.length === 1) {
    const country = getCountryByCode(cellVisits[0].countryCode)
    const dateLabel = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    })
    return (
      <div
        className={`${baseClasses} ${todayClasses} bg-gray-50 dark:bg-gray-900`}
        role="gridcell"
        aria-label={`${dateLabel}, visited ${country?.name || cellVisits[0].countryCode}`}
      >
        <div className="w-12 h-8 relative">
          <FlagPlaceholder countryCode={cellVisits[0].countryCode} />
          {country && (
            <span className="sr-only">
              {country.name} on {dayNumber}
            </span>
          )}
        </div>
      </div>
    )
  }

  if (cellVisits.length === 2) {
    const country1 = getCountryByCode(cellVisits[0].countryCode)
    const country2 = getCountryByCode(cellVisits[1].countryCode)
    const dateLabel = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    })
    return (
      <div
        className={`${baseClasses} ${todayClasses} bg-gray-50 dark:bg-gray-900`}
        role="gridcell"
        aria-label={`${dateLabel}, visited ${country1?.name || cellVisits[0].countryCode} and ${country2?.name || cellVisits[1].countryCode}`}
      >
        <div className="flex flex-col gap-0.5 w-12">
          <div className="h-4 relative">
            <FlagPlaceholder countryCode={cellVisits[0].countryCode} />
          </div>
          <div className="h-4 relative">
            <FlagPlaceholder countryCode={cellVisits[1].countryCode} />
          </div>
          {country1 && country2 && (
            <span className="sr-only">
              {country1.name} and {country2.name} on {dayNumber}
            </span>
          )}
        </div>
      </div>
    )
  }

  return null
}

function FlagPlaceholder({ countryCode }: { countryCode: string }) {
  const country = getCountryByCode(countryCode)

  if (!country) {
    return (
      <div className="w-full h-full bg-linear-to-br from-red-400 to-red-600 rounded-sm flex items-center justify-center">
        <span className="text-white text-[8px] font-mono">{countryCode}</span>
      </div>
    )
  }

  let FlagComponent

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    FlagComponent = require(`country-flag-icons/react/3x2/${countryCode}`).default
  } catch {
    FlagComponent = null
  }

  if (!FlagComponent) {
    return (
      <div className="w-full h-full bg-linear-to-br from-blue-400 to-blue-600 rounded-sm flex items-center justify-center">
        <span className="text-white text-[8px] font-mono">{countryCode}</span>
      </div>
    )
  }

  return (
    <FlagComponent
      className="w-full h-full rounded-sm object-cover"
      title={country.name}
    />
  )
}
