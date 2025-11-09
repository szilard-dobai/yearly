'use client'

import { useState } from 'react'
import type { CalendarData, Country } from '../lib/types'
import { searchCountries } from '../lib/countries'
import { expandDateRange, canAddVisitToDate } from '../lib/calendar'
import { generateId } from '../lib/utils'

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
      <div className="relative">
        <label
          htmlFor="country-search"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Country
        </label>
        <input
          id="country-search"
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => setShowDropdown(searchQuery.length > 0)}
          placeholder="Search countries..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {showDropdown && filteredCountries.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredCountries.slice(0, 10).map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleCountrySelect(country)}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white"
              >
                {country.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label
          htmlFor="start-date"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Start Date
        </label>
        <input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label
          htmlFor="end-date"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          End Date (Optional)
        </label>
        <input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      <button
        type="submit"
        disabled={!selectedCountry || !startDate}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
      >
        Add Visit
      </button>
    </form>
  )
}
