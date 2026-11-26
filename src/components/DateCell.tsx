'use client'

import { memo } from 'react'
import { isToday } from '../lib/calendar'
import { getCountryByCode } from '../lib/countries'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { toDayKey } from '@/lib/selection'
import { DayFlags } from './Emoji'

interface DateCellProps {
  date: Date | null
  countries?: string
  selected?: boolean
  selectionEdge?: boolean
  roundStart?: boolean
  roundEnd?: boolean
  tabbable?: boolean
}

function DateCell({
  date,
  countries,
  selected = false,
  selectionEdge = false,
  roundStart = false,
  roundEnd = false,
  tabbable = false,
}: DateCellProps) {
  const { settings } = useSettings()
  if (!date) {
    return (
      <div className="aspect-square p-1" role="gridcell" aria-hidden="true" />
    )
  }

  const codes = countries ? countries.split(',') : []
  const dayNumber = date.getDate()
  const hasVisits = codes.length > 0

  const dateLabel = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })

  const showTodayHighlight = settings.highlightToday && isToday(date)

  const allCountries = codes
    .map((code) => getCountryByCode(code)?.name || code)
    .join(', ')

  const label = hasVisits
    ? `${dateLabel}, visited ${allCountries}`
    : `${dateLabel}, no visits`

  return (
    <div
      className="aspect-square p-0.5 sm:p-1 flex items-center justify-center relative data-selected:bg-red-500/12 dark:data-selected:bg-red-500/22 data-round-start:rounded-s-lg data-round-end:rounded-e-lg"
      role="gridcell"
      aria-selected={selected}
      data-selected={selected || undefined}
      data-round-start={(selected && roundStart) || undefined}
      data-round-end={(selected && roundEnd) || undefined}
    >
      <button
        type="button"
        data-day={toDayKey(date)}
        data-edge={selectionEdge || undefined}
        tabIndex={tabbable ? 0 : -1}
        aria-label={label}
        className="relative flex flex-col items-center justify-center w-full h-full rounded-md cursor-pointer outline-none transition-colors hover:bg-black/5 dark:hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-red-500/60 data-edge:ring-2 data-edge:ring-red-500 data-edge:bg-white dark:data-edge:bg-black"
      >
        {hasVisits ? (
          <DayFlags codes={codes} className="text-lg sm:text-2xl" />
        ) : (
          <span
            className={`text-[10px] sm:text-sm font-medium ${showTodayHighlight ? 'text-red-500 font-bold' : 'text-gray-900 dark:text-white'}`}
          >
            {dayNumber}
          </span>
        )}
      </button>
    </div>
  )
}

export default memo(DateCell)
