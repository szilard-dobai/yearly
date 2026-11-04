'use client'

import CountryPickerDialog from '@/components/CountryPickerDialog'
import Flag from '@/components/Flag'
import { Button } from '@/components/ui/button'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { getCountryByCode } from '@/lib/countries'
import {
  formatSelectionLabel,
  getSelectionDays,
  isSingleDay,
  type DaySelection,
} from '@/lib/selection'
import type { CountryVisit } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  addCountryToDays,
  getLocaleCountryCode,
  summarizeDays,
  suggestCountries,
} from '@/lib/visits'
import { Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

export interface AddFromSelectionMeta {
  suggested: boolean
  emptyOnly: boolean
}

interface DaySelectionPanelProps {
  selection: DaySelection
  visits: CountryVisit[]
  year: number
  onAdd: (countryCode: string, days: Date[], meta: AddFromSelectionMeta) => void
  onRemove: (days: Date[], countryCode?: string) => void
  onClose: () => void
}

const chipClassName =
  'inline-flex h-10 sm:h-9 items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-900 transition-colors cursor-pointer hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-[#222222] dark:text-zinc-100 dark:hover:bg-white/12 outline-none focus-visible:ring-2 focus-visible:ring-red-500/60'

function pluralDays(count: number) {
  return `${count} ${count === 1 ? 'day' : 'days'}`
}

export default function DaySelectionPanel({
  selection,
  visits,
  year,
  onAdd,
  onRemove,
  onClose,
}: DaySelectionPanelProps) {
  const { settings } = useSettings()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [emptyOnly, setEmptyOnly] = useState(false)

  const days = useMemo(() => getSelectionDays(selection), [selection])
  const summary = useMemo(() => summarizeDays(visits, days), [visits, days])
  const suggestions = useMemo(
    () =>
      suggestCountries({
        visits,
        days,
        year,
        fallback: [getLocaleCountryCode()],
      }),
    [visits, days, year]
  )

  const single = isSingleDay(selection)
  const canChooseEmptyOnly =
    summary.emptyDays.length > 0 && summary.emptyDays.length < days.length
  const targetDays = canChooseEmptyOnly && emptyOnly ? summary.emptyDays : days
  const allFull = summary.fullDays === days.length

  useEffect(() => {
    if (pickerOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pickerOpen, onClose])

  const add = (countryCode: string, suggested: boolean) => {
    onAdd(countryCode, targetDays, {
      suggested,
      emptyOnly: canChooseEmptyOnly && emptyOnly,
    })
  }

  return (
    <section
      aria-label="Selected days"
      className="pointer-events-auto w-full rounded-t-2xl border border-b-0 border-gray-200 bg-white px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] sm:max-w-lg sm:rounded-2xl sm:border-b sm:p-5 sm:shadow-2xl dark:border-white/8 dark:bg-[#1a1a1a] dark:shadow-black/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
            {formatSelectionLabel(selection)}
          </p>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {single
              ? 'Pick another day to select a whole trip'
              : pluralDays(days.length)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Clear selection"
          className="-me-1 shrink-0 text-gray-500 dark:text-zinc-400"
        >
          <X className="size-5" />
        </Button>
      </div>

      {summary.countries.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-500">
              {single ? 'On this day' : 'On these days'}
            </p>
            {summary.countries.length > 1 && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onRemove(days)}
                className="text-gray-500 dark:text-zinc-400"
              >
                <Trash2 className="size-3.5" />
                Clear all
              </Button>
            )}
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {summary.countries.map(({ countryCode, days: count }) => {
              const name = getCountryByCode(countryCode)?.name ?? countryCode
              return (
                <li
                  key={countryCode}
                  className="inline-flex h-10 sm:h-9 items-center gap-2 rounded-full bg-gray-100 ps-3.5 pe-1 text-sm font-medium text-gray-900 dark:bg-white/8 dark:text-zinc-100"
                >
                  <Flag
                    countryCode={countryCode}
                    size="sm"
                    displayMode={settings.flagDisplayMode}
                  />
                  <span>{name}</span>
                  {!single && (
                    <span className="text-gray-500 dark:text-zinc-400">
                      {count}d
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(days, countryCode)}
                    aria-label={`Remove ${name} from ${single ? 'this day' : 'these days'}`}
                    className="flex size-8 sm:size-7 items-center justify-center rounded-full text-gray-500 transition-colors cursor-pointer hover:bg-gray-200 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/12 dark:hover:text-zinc-100"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="mt-4">
        {allFull ? (
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {single ? 'This day already has' : 'These days already have'} two
            countries. Remove one to add another.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-500">
                Add a country
              </p>
              {canChooseEmptyOnly && (
                <div
                  role="group"
                  aria-label="Which days to fill"
                  className="flex rounded-full bg-gray-100 p-0.5 text-xs font-medium dark:bg-white/8"
                >
                  {[
                    { value: false, label: `All ${days.length}` },
                    {
                      value: true,
                      label: `${summary.emptyDays.length} empty`,
                    },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      aria-pressed={emptyOnly === option.value}
                      onClick={() => setEmptyOnly(option.value)}
                      className={cn(
                        'rounded-full px-2.5 py-1 transition-colors cursor-pointer',
                        emptyOnly === option.value
                          ? 'bg-white text-gray-900 shadow-sm dark:bg-[#2a2a2a] dark:text-zinc-100'
                          : 'text-gray-500 dark:text-zinc-400'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((code) => {
                const name = getCountryByCode(code)?.name ?? code
                const addable =
                  addCountryToDays(visits, code, targetDays).added > 0
                return (
                  <button
                    key={code}
                    type="button"
                    disabled={!addable}
                    onClick={() => add(code, true)}
                    className={chipClassName}
                    aria-label={`Add ${name}`}
                  >
                    <Flag
                      countryCode={code}
                      size="sm"
                      displayMode={settings.flagDisplayMode}
                    />
                    {name}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className={cn(
                  chipClassName,
                  'border-dashed text-gray-600 dark:text-zinc-300'
                )}
              >
                <Search className="size-4" />
                {suggestions.length > 0 ? 'Other country' : 'Choose a country'}
              </button>
            </div>
          </>
        )}
      </div>

      <CountryPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        suggestions={suggestions}
        onSelect={(code) => {
          setPickerOpen(false)
          add(code, false)
        }}
      />
    </section>
  )
}
