import { getCountryByCode } from '../lib/countries'
import { useSettings } from '@/lib/contexts/SettingsContext'
import Flag from './Flag'
import { Badge } from '@/components/ui/badge'

export interface CountryRankingItem {
  countryCode: string
  days: number
  rank: number
}

interface CountryRankingListProps {
  items: CountryRankingItem[]
  maxItems?: number
}

export default function CountryRankingList({
  items,
  maxItems = 10,
}: CountryRankingListProps) {
  const { settings } = useSettings()
  const displayItems = maxItems > 0 ? items.slice(0, maxItems) : items

  if (displayItems.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-zinc-400 text-sm">
        No country visits yet
      </div>
    )
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <span className="text-lg" title="1st place">
            🥇
          </span>
        )
      case 2:
        return (
          <span className="text-lg" title="2nd place">
            🥈
          </span>
        )
      case 3:
        return (
          <span className="text-lg" title="3rd place">
            🥉
          </span>
        )
      default:
        return (
          <span className="text-sm font-medium text-gray-500 dark:text-zinc-400 w-6 text-center">
            {rank}
          </span>
        )
    }
  }

  return (
    <div className="space-y-2">
      {displayItems.map((item) => {
        const country = getCountryByCode(item.countryCode)
        const countryName = country?.name || item.countryCode

        return (
          <div
            key={item.countryCode}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/4 transition-colors"
          >
            <div className="shrink-0 w-6 flex items-center justify-center">
              {getRankBadge(item.rank)}
            </div>

            <div className="shrink-0 w-8 h-6 flex items-center">
              <Flag
                countryCode={item.countryCode}
                displayMode={settings.flagDisplayMode}
              />
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-900 dark:text-zinc-100 truncate block">
                {countryName}
              </span>
            </div>

            <div className="shrink-0">
              <Badge variant="primary">
                {item.days} {item.days === 1 ? 'day' : 'days'}
              </Badge>
            </div>
          </div>
        )
      })}
    </div>
  )
}
