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
}

const FLAG_TEXT_SIZES: Record<FlagSize, string> = {
  sm: 'text-base sm:text-lg',
  md: 'text-lg sm:text-2xl',
  lg: 'text-xl sm:text-3xl',
}

const Flag = ({
  className,
  countryCode,
  displayMode = 'emoji',
  size = 'md',
}: Props) => {
  if (displayMode === 'icon') {
    const code = countryCode.toUpperCase()
    const Icon = FlagIcons[code as keyof typeof FlagIcons]
    if (!Icon) return null
    return <Icon className={cn(FLAG_SIZES[size], className)} />
  }

  return (
    <div className={cn(FLAG_TEXT_SIZES[size], 'leading-none', className)}>
      {getFlagEmoji(countryCode)}
    </div>
  )
}

export default Flag
