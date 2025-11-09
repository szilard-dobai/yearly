import { getCountryByCode } from '../lib/countries'
import * as flags from 'country-flag-icons/react/3x2'

interface FlagPlaceholderProps {
  countryCode: string
}

/**
 * FlagPlaceholder Component
 * Displays country flag using country-flag-icons library
 * Falls back to colored placeholder with country code if flag is unavailable
 */
export default function FlagPlaceholder({ countryCode }: FlagPlaceholderProps) {
  const country = getCountryByCode(countryCode)

  if (!country) {
    return (
      <div className="w-full h-full bg-linear-to-br from-red-400 to-red-600 rounded flex items-center justify-center shadow-sm">
        <span className="text-white text-[8px] font-semibold font-mono drop-shadow">
          {countryCode}
        </span>
      </div>
    )
  }

  // Get the flag component from the imported flags object
  const FlagComponent = flags[countryCode as keyof typeof flags] as
    | React.ComponentType<React.SVGProps<SVGSVGElement>>
    | undefined

  if (!FlagComponent) {
    return (
      <div className="w-full h-full bg-linear-to-br from-blue-400 to-blue-600 rounded flex items-center justify-center shadow-sm">
        <span className="text-white text-[8px] font-semibold font-mono drop-shadow">
          {countryCode}
        </span>
      </div>
    )
  }

  return (
    <FlagComponent className="w-full h-full rounded object-cover shadow-sm border border-gray-200/50 dark:border-gray-700/50" />
  )
}
