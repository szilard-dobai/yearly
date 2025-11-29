import { getFlagEmoji } from '@/lib/countries'
import { FLAG_SIZES, type FlagSize } from '@/lib/constants'
import { cn } from '@/lib/utils'
import * as FlagIcons from 'country-flag-icons/react/3x2'
import { FlagDisplayMode } from './Settings'

type Props = {
  className?: string
  countryCode: string
  displayMode?: FlagDisplayMode
  size?: FlagSize
  /** When true, flag fills container and shows placeholder on missing flag */
  fill?: boolean
}

const FLAG_TEXT_SIZES: Record<FlagSize, string> = {
  sm: 'text-base sm:text-lg',
  md: 'text-lg sm:text-2xl',
  lg: 'text-xl sm:text-3xl',
}

function FlagPlaceholder({ countryCode }: { countryCode: string }) {
  return (
    <div className="w-full h-full bg-linear-to-br from-blue-400 to-blue-600 rounded flex items-center justify-center shadow-sm">
      <span className="text-white text-[8px] font-semibold font-mono drop-shadow">
        {countryCode.toUpperCase()}
      </span>
    </div>
  )
}

const Flag = ({
  className,
  countryCode,
  displayMode = 'emoji',
  size = 'md',
  fill = false,
}: Props) => {
  const code = countryCode.toUpperCase()
  const Icon = FlagIcons[code as keyof typeof FlagIcons]

  if (displayMode === 'icon' || fill) {
    if (!Icon) {
      return fill ? <FlagPlaceholder countryCode={countryCode} /> : null
    }

    const iconClassName = fill
      ? 'w-full h-full rounded object-cover shadow-sm border border-gray-200/50 dark:border-gray-700/50'
      : FLAG_SIZES[size]

    return <Icon className={cn(iconClassName, className)} />
  }

  return (
    <div className={cn(FLAG_TEXT_SIZES[size], 'leading-none', className)}>
      {getFlagEmoji(countryCode)}
    </div>
  )
}

export default Flag
