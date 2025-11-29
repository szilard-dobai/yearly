import { getFlagEmoji } from '@/lib/countries'
import * as FlagIcons from 'country-flag-icons/react/3x2'
import { FlagDisplayMode } from './Settings'

type Props = {
  className?: string
  countryCode: string
  displayMode?: FlagDisplayMode
}

const Flag = ({ className, countryCode, displayMode = 'emoji' }: Props) => {
  if (displayMode === 'icon') {
    const code = countryCode.toUpperCase()
    const Icon = FlagIcons[code as keyof typeof FlagIcons]
    if (!Icon) return null
    return <Icon className={`w-6 h-4 sm:w-8 sm:h-6 ${className}`} />
  }

  return (
    <div className={`text-lg sm:text-2xl leading-none ${className}`}>
      {getFlagEmoji(countryCode)}
    </div>
  )
}

export default Flag
