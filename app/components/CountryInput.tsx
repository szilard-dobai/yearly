'use client'

import { useState } from 'react'
import type { CalendarData, Country } from '../lib/types'
import { searchCountries } from '../lib/countries'
import { expandDateRange, canAddVisitToDate } from '../lib/calendar'
import { generateId } from '../lib/utils'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Plus } from 'lucide-react'

interface CountryInputProps {
  calendarData: CalendarData
  onDataChange: (data: CalendarData) => void
}

export default function CountryInput({
  calendarData,
  onDataChange,
}: CountryInputProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const filteredCountries =
    searchQuery.length > 0 ? searchCountries(searchQuery) : []

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country)
    setSearchQuery(country.name)
    setShowDropdown(false)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setSelectedCountry(null)
    setShowDropdown(value.length > 0)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedCountry) {
      setError('Please select a country')
      return
    }

    if (!startDate) {
      setError('Please select a start date')
      return
    }

    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : start

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

    setSearchQuery('')
    setSelectedCountry(null)
    setStartDate('')
    setEndDate('')
    setError('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative space-y-2">
        <Label htmlFor="country-search">Country</Label>
        <Input
          id="country-search"
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => setShowDropdown(searchQuery.length > 0)}
          placeholder="Search countries..."
        />
        {showDropdown && filteredCountries.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
            {filteredCountries.slice(0, 10).map((country) => (
              <Button
                key={country.code}
                type="button"
                variant="ghost"
                onClick={() => handleCountrySelect(country)}
                className="w-full justify-start"
              >
                {country.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="start-date">Start Date</Label>
        <Input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="end-date">End Date (Optional)</Label>
        <Input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}

      <Button
        type="submit"
        disabled={!selectedCountry || !startDate}
        className="w-full"
      >
        <Plus className="size-4" />
        Add Visit
      </Button>
    </form>
  )
}
