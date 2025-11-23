'use client'

import { useState } from 'react'
import type { CalendarData, Country } from '../lib/types'
import { searchCountries } from '../lib/countries'
import { expandDateRange, canAddVisitToDate } from '../lib/calendar'
import { generateId } from '../lib/utils'
import { Button } from '@/app/components/ui/button'
import { Label } from '@/app/components/ui/label'
import { Calendar } from '@/app/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/app/components/ui/command'
import { Plus, CalendarIcon, X, Check, ChevronsUpDown } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/app/lib/utils'
import type { DateRange } from 'react-day-picker'
import type { WeekStartsOn } from './Settings'

interface CountryInputProps {
  year: number
  calendarData: CalendarData
  onDataChange: (data: CalendarData) => void
  weekStartsOn?: WeekStartsOn
}

export default function CountryInput({
  year,
  calendarData,
  onDataChange,
  weekStartsOn = 0,
}: CountryInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [error, setError] = useState('')
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isCountryOpen, setIsCountryOpen] = useState(false)

  const handleDateSelect = (range: DateRange | undefined) => {
    setDateRange(range)
  }

  const handleClearDates = () => {
    setDateRange(undefined)
    setIsCalendarOpen(false)
  }

  const getDateRangeText = () => {
    if (!dateRange?.from) {
      return 'Pick a date'
    }
    if (dateRange.to) {
      return `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`
    }
    return format(dateRange.from, 'MMM d, yyyy')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedCountry) {
      setError('Please select a country')
      return
    }

    if (!dateRange?.from) {
      setError('Please select a date')
      return
    }

    const start = dateRange.from
    const end = dateRange.to || start

    if (end < start) {
      setError('End date cannot be before start date')
      return
    }

    const dates = expandDateRange(start, end)

    for (const date of dates) {
      if (!canAddVisitToDate(date, calendarData.visits)) {
        setError(
          `Maximum 2 countries per day exceeded for ${date.toLocaleDateString()}`
        )
        return
      }
    }

    const newVisits = dates.map((date) => ({
      id: generateId(),
      countryCode: selectedCountry.code,
      date,
    }))

    const newData = {
      visits: [...calendarData.visits, ...newVisits],
    }

    onDataChange(newData)

    setSelectedCountry(null)
    setDateRange(undefined)
    setError('')
    setIsCalendarOpen(false)
    setIsCountryOpen(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Country</Label>
        <Popover open={isCountryOpen} onOpenChange={setIsCountryOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={isCountryOpen}
              className="w-full justify-between font-normal"
            >
              {selectedCountry ? selectedCountry.name : 'Select country...'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Search countries..." />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {searchCountries('').map((country) => (
                    <CommandItem
                      key={country.code}
                      value={country.name}
                      onSelect={() => {
                        setSelectedCountry(country)
                        setIsCountryOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedCountry?.code === country.code
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      {country.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Date Range</Label>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {getDateRangeText()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
            <div className="p-3 border-b flex items-center justify-between">
              <p className="text-sm font-medium">Select date range</p>
              {dateRange?.from && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearDates}
                  className="h-7 px-2"
                >
                  <X className="h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>
            <Calendar
              mode="range"
              captionLayout="label"
              selected={dateRange}
              startMonth={new Date(year, 0)}
              endMonth={new Date(year, 11)}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              weekStartsOn={weekStartsOn}
            />
          </PopoverContent>
        </Popover>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <Button
        type="submit"
        disabled={!selectedCountry || !dateRange?.from}
        className="w-full"
      >
        <Plus className="size-4" />
        Add Visit
      </Button>
    </form>
  )
}
