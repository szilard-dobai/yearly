import { getFlagEmoji } from '@/lib/countries'
import { FLAG_SIZES, type FlagSize } from '@/lib/constants'
import { cn } from '@/lib/utils'
import * as FlagIcons from 'country-flag-icons/react/3x2'
import type { FlagDisplayMode } from '@/lib/contexts/SettingsContext'

type Props = {
  className?: string
  countryCode: string
  displayMode?: FlagDisplayMode
  size?: FlagSize
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
}: Props) => {
  const code = countryCode.toUpperCase()
  const Icon = FlagIcons[code as keyof typeof FlagIcons]

  if (displayMode === 'icon') {
    if (!Icon) {
      return <FlagPlaceholder countryCode={countryCode} />
    }

    const iconClassName = FLAG_SIZES[size]

    return <Icon className={cn(iconClassName, className)} />
  }

  return (
    <div className={cn(FLAG_TEXT_SIZES[size], 'leading-none', className)}>
      {getFlagEmoji(countryCode)}
    </div>
  )
}

export default Flag
