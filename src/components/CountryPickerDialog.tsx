'use client'

import Flag from '@/components/Flag'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { getAllCountries, getCountryByCode } from '@/lib/countries'
import { useState } from 'react'

interface CountryPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  suggestions: string[]
  onSelect: (countryCode: string) => void
}

export default function CountryPickerDialog({
  open,
  onOpenChange,
  suggestions,
  onSelect,
}: CountryPickerDialogProps) {
  const [search, setSearch] = useState('')

  const handleOpenChange = (next: boolean) => {
    if (!next) setSearch('')
    onOpenChange(next)
  }

  const handleSelect = (code: string) => {
    setSearch('')
    onSelect(code)
  }

  const suggestedCountries = suggestions
    .map(getCountryByCode)
    .filter((country) => country !== undefined)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-4 translate-y-0 sm:top-[50%] sm:translate-y-[-50%] max-w-[calc(100%-2rem)] sm:max-w-md gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Choose a country</DialogTitle>
        <DialogDescription className="sr-only">
          Search for the country you visited on the selected days
        </DialogDescription>
        <Command>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search countries..."
            autoFocus
            className="text-base sm:text-sm"
          />
          <CommandList className="max-h-[min(60vh,24rem)]">
            <CommandEmpty>No country found.</CommandEmpty>
            {!search && suggestedCountries.length > 0 && (
              <CommandGroup heading="Suggested">
                {suggestedCountries.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={`suggested:${country.code}`}
                    onSelect={() => handleSelect(country.code)}
                    className="py-2.5"
                  >
                    <Flag countryCode={country.code} size="sm" />
                    {country.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup heading="All countries">
              {getAllCountries().map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.name}
                  onSelect={() => handleSelect(country.code)}
                  className="py-2.5"
                >
                  <Flag countryCode={country.code} size="sm" />
                  {country.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
