'use client'

import { useDayGestures } from '@/lib/hooks/useDayGestures'
import {
  applyTap,
  fromDayKey,
  getMonthSelection,
  getSelectionBounds,
  toDayKey,
  type DaySelection,
} from '@/lib/selection'
import type { CalendarData } from '@/lib/types'
import { useRef, type KeyboardEvent } from 'react'
import MonthGrid from './MonthGrid'

const ARROW_KEY_OFFSETS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
}

function getDefaultFocusKey(year: number) {
  const today = new Date()
  return today.getFullYear() === year
    ? toDayKey(today)
    : toDayKey(new Date(year, 0, 1))
}

interface CalendarGridProps {
  year: number
  calendarData: CalendarData
  selection?: DaySelection | null
  onSelectionChange?: (selection: DaySelection | null) => void
  onMonthExport?: (month: number) => void
}

export default function CalendarGrid({
  year,
  calendarData,
  selection = null,
  onSelectionChange,
  onMonthExport,
}: CalendarGridProps) {
  const visits = calendarData.visits
  const gridRef = useRef<HTMLDivElement>(null)
  const bounds = selection ? getSelectionBounds(selection) : null
  const focusKey = selection?.focus ?? getDefaultFocusKey(year)

  useDayGestures(
    gridRef,
    {
      onTap: (key) => onSelectionChange?.(applyTap(selection, key)),
      onDrag: (anchor, focus, method) =>
        onSelectionChange?.({ anchor, focus, method }),
    },
    Boolean(onSelectionChange)
  )

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const offset = ARROW_KEY_OFFSETS[event.key]
    const key =
      event.target instanceof HTMLElement ? event.target.dataset.day : null
    if (!offset || !key) return
    const next = fromDayKey(key)
    next.setDate(next.getDate() + offset)
    const target = gridRef.current?.querySelector<HTMLElement>(
      `[data-day="${toDayKey(next)}"]`
    )
    if (!target) return
    event.preventDefault()
    target.focus()
  }

  return (
    <div>
      <div className="mb-4 border-b border-gray-200 dark:border-white/10 pb-4">
        <h2 className="text-4xl sm:text-6xl font-bold text-red-500">{year}</h2>
      </div>
      <div
        ref={gridRef}
        onKeyDown={handleKeyDown}
        className="grid grid-cols-1 min-[25rem]:grid-cols-2 lg:grid-cols-3 gap-x-4 min-[25rem]:gap-x-6 lg:gap-x-8 gap-y-4 min-[25rem]:gap-y-6 select-none [-webkit-touch-callout:none]"
      >
        {Array.from({ length: 12 }, (_, month) => (
          <MonthGrid
            key={month}
            year={year}
            month={month}
            visits={visits}
            selectionStartKey={bounds?.startKey ?? null}
            selectionEndKey={bounds?.endKey ?? null}
            focusKey={focusKey}
            onSelectMonth={
              onSelectionChange
                ? () => onSelectionChange(getMonthSelection(year, month))
                : undefined
            }
            onExport={onMonthExport ? () => onMonthExport(month) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
