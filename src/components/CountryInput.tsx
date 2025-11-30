'use client'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useSettings } from '@/lib/contexts/SettingsContext'
import dayjs from 'dayjs'
import { CalendarIcon, Check, ChevronsUpDown, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import {
  canAddVisitToDate,
  expandDateRange,
  hasVisitForCountryOnDate,
} from '../lib/calendar'
import { searchCountries } from '../lib/countries'
import type { CalendarData, Country } from '../lib/types'
import { generateId } from '../lib/utils'

interface CountryInputProps {
  year: number
  calendarData: CalendarData
  onDataChange: (data: CalendarData) => void
}

export default function CountryInput({
  year,
  calendarData,
  onDataChange,
}: CountryInputProps) {
  const { settings } = useSettings()
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
      return `${dayjs(dateRange.from).format('MMM D, YYYY')} - ${dayjs(dateRange.to).format('MMM D, YYYY')}`
    }
    return dayjs(dateRange.from).format('MMM D, YYYY')
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
      if (
        hasVisitForCountryOnDate(date, selectedCountry.code, calendarData.visits)
      ) {
        setError(
          `${selectedCountry.name} is already added for ${date.toLocaleDateString()}`
        )
        return
      }
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
                  size="xs"
                  onClick={handleClearDates}
                >
                  <X className="size-3" />
                  Clear
                </Button>
              )}
            </div>
            <Calendar
              mode="range"
              captionLayout="dropdown-months"
              selected={dateRange}
              startMonth={new Date(year, 0)}
              endMonth={new Date(year, 11)}
              onSelect={handleDateSelect}
              numberOfMonths={1}
              weekStartsOn={settings.weekStartsOn}
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
