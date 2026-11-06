'use client'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'
import { CalendarIcon, X } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
import type { DateRange } from 'react-day-picker'

const WIDE_QUERY = '(min-width: 768px)'

function subscribeToWidth(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function useIsWide() {
  return useSyncExternalStore(
    subscribeToWidth,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false
  )
}

export function formatDateRange(range: DateRange | undefined): string {
  if (!range?.from) return 'All time'
  const from = dayjs(range.from)
  const to = dayjs(range.to ?? range.from)
  if (from.isSame(to, 'day')) return from.format('D MMM YYYY')
  const fromFormat = from.isSame(to, 'year') ? 'D MMM' : 'D MMM YYYY'
  return `${from.format(fromFormat)} – ${to.format('D MMM YYYY')}`
}

export default function DateRangePicker({
  value,
  onChange,
  className,
}: {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  className?: string
}) {
  const { settings } = useSettings()
  const isWide = useIsWide()
  const [open, setOpen] = useState(false)
  const label = formatDateRange(value)
  const today = new Date()

  const handleSelect = (range: DateRange | undefined) => {
    onChange(range)
    if (range?.from && range.to && !dayjs(range.from).isSame(range.to, 'day')) {
      setOpen(false)
    }
  }

  const handleClear = () => {
    onChange(undefined)
    setOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            aria-label={`Date range: ${label}`}
            className={cn(
              'w-full justify-start text-left font-normal',
              value?.from && 'pr-9'
            )}
          >
            <CalendarIcon className="size-4" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
          <div className="flex items-center justify-between border-b p-3">
            <p className="text-sm font-medium">Select date range</p>
            {value?.from && (
              <Button variant="ghost" size="xs" onClick={handleClear}>
                <X className="size-3" />
                Clear
              </Button>
            )}
          </div>
          <Calendar
            mode="range"
            selected={value}
            onSelect={handleSelect}
            numberOfMonths={isWide ? 2 : 1}
            defaultMonth={
              value?.from ??
              dayjs(today)
                .subtract(isWide ? 1 : 0, 'month')
                .toDate()
            }
            endMonth={today}
            disabled={{ after: today }}
            weekStartsOn={settings.weekStartsOn}
          />
        </PopoverContent>
      </Popover>
      {value?.from && (
        <button
          type="button"
          aria-label="Clear date range"
          title="Clear date range"
          onClick={handleClear}
          className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-sm p-1 opacity-50 hover:opacity-100"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
