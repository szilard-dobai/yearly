import type { FlagDisplayMode } from '@/lib/contexts/SettingsContext'
import { getCountryByCode } from '@/lib/countries'
import {
  UNIT_SCALE,
  type RankRowSizes,
  type StatValue,
} from '@/lib/export-canvas'
import { cn } from '@/lib/utils'
import { ExportFlag } from './ExportFlag'

const MEDALS = ['🥇', '🥈', '🥉']

export function getCountryName(code: string) {
  return getCountryByCode(code)?.name ?? code
}

interface ExportStatTileProps {
  label: string
  value: StatValue
  labelSize: number
  valueSize: number
  height: number
  padding: number
  className?: string
}

export function ExportStatTile({
  label,
  value,
  labelSize,
  valueSize,
  height,
  padding,
  className,
}: ExportStatTileProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col justify-between rounded-4xl border bg-gray-100 dark:bg-white/5',
        className
      )}
      style={{ height, padding }}
    >
      <p
        className="text-gray-500 dark:text-gray-400 whitespace-nowrap"
        style={{ fontSize: labelSize, lineHeight: 1.2 }}
      >
        {label}
      </p>
      <div
        className="font-bold text-gray-900 dark:text-white whitespace-nowrap"
        style={{ fontSize: valueSize, lineHeight: 1 }}
      >
        {value.value}
        {value.unit && (
          <span
            className="ml-[0.2em] font-normal text-gray-500 dark:text-gray-400"
            style={{ fontSize: `${UNIT_SCALE}em` }}
          >
            {value.unit}
          </span>
        )}
      </div>
    </div>
  )
}

interface ExportRankRowProps {
  rank: number
  code: string
  days: number
  sizes: RankRowSizes
  nameSize: number
  flagMode: FlagDisplayMode
}

export function ExportRankRow({
  rank,
  code,
  days,
  sizes,
  nameSize,
  flagMode,
}: ExportRankRowProps) {
  return (
    <div
      className="flex items-center rounded-4xl border bg-gray-100 dark:bg-white/5"
      style={{
        height: sizes.height,
        paddingInline: sizes.paddingX,
        gap: sizes.gap,
      }}
    >
      <span
        className="flex shrink-0 justify-center font-semibold leading-none text-gray-500 dark:text-gray-400"
        style={{
          width: sizes.rankWidth,
          fontSize: rank <= MEDALS.length ? sizes.medalSize : sizes.rankSize,
        }}
      >
        {rank <= MEDALS.length ? MEDALS[rank - 1] : `${rank}.`}
      </span>
      <span
        className="flex shrink-0 items-center justify-center"
        style={{ width: sizes.flagSize }}
      >
        <ExportFlag code={code} size={sizes.flagSize} mode={flagMode} />
      </span>
      <span
        className="min-w-0 flex-1 truncate font-medium text-gray-900 dark:text-white"
        style={{ fontSize: nameSize, lineHeight: 1.2 }}
      >
        {getCountryName(code)}
      </span>
      <span
        className="shrink-0 rounded-full bg-gray-200 font-medium leading-none text-gray-600 dark:bg-white/10 dark:text-gray-300 whitespace-nowrap"
        style={{
          fontSize: sizes.pillSize,
          padding: `${sizes.pillSize * 0.4}px ${sizes.pillSize * 0.7}px`,
        }}
      >
        {days} {days === 1 ? 'day' : 'days'}
      </span>
    </div>
  )
}
