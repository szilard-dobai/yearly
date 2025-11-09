import { getCountryByCode } from '../lib/countries'

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
      <div className="w-full h-full bg-linear-to-br from-red-400 to-red-600 rounded-sm flex items-center justify-center">
        <span className="text-white text-[8px] font-mono">{countryCode}</span>
      </div>
    )
  }

  let FlagComponent

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    FlagComponent = require(
      `country-flag-icons/react/3x2/${countryCode}`
    ).default
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
