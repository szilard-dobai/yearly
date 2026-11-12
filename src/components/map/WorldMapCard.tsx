'use client'

import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StandardCard } from '@/components/ui/card-variants'
import {
  CONTINENT_BY_COUNTRY,
  CONTINENT_NAMES,
  type ContinentCode,
} from '@/lib/continents'
import { buildDayMap } from '@/lib/trips'
import type { CalendarData } from '@/lib/types'
import { cn } from '@/lib/utils'
import { countriesInScope, SHADE_STEPS, shareOfWorld } from '@/lib/world-map'
import { Check } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import MapExportButton from './MapExportButton'
import WorldMap, { type MapMode } from './WorldMap'

const CONTINENT_ORDER: ContinentCode[] = [
  'EU',
  'AS',
  'NA',
  'SA',
  'AF',
  'OC',
  'AN',
]

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (value: T) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-white/8 dark:bg-[#0a0a0a]"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === option.value
              ? 'bg-white text-gray-900 shadow-sm dark:bg-[#222222] dark:text-zinc-100'
              : 'text-gray-500 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-zinc-200'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

interface WorldMapCardProps {
  calendarData: CalendarData
  year: number
}

export default function WorldMapCard({
  calendarData,
  year,
}: WorldMapCardProps) {
  const [scope, setScope] = useState<'year' | 'all'>('year')
  const [mode, setMode] = useState<MapMode>('flags')
  const [focus, setFocus] = useState<ContinentCode | null>(null)
  const dayMap = useMemo(
    () => buildDayMap(calendarData.visits),
    [calendarData.visits]
  )
  const countries = useMemo(
    () => countriesInScope(dayMap, scope === 'year' ? year : null),
    [dayMap, scope, year]
  )
  const continents = new Set(
    countries
      .map((c) => CONTINENT_BY_COUNTRY[c.code])
      .filter((c): c is ContinentCode => Boolean(c))
  )
  const activeFocus = focus && continents.has(focus) ? focus : null
  const focusCodes = activeFocus
    ? countries
        .map((c) => c.code)
        .filter((code) => CONTINENT_BY_COUNTRY[code] === activeFocus)
    : null

  if (calendarData.visits.length === 0) return null

  return (
    <StandardCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-zinc-100">
          <span className="text-2xl">🗺️</span>
          World map
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Which trips"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'year', label: String(year) },
              { value: 'all', label: 'All time' },
            ]}
          />
          <Segmented
            label="Colour countries by"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'flags', label: 'Flags' },
              { value: 'shade', label: 'By days' },
            ]}
          />
          {continents.size > 1 && (
            <Segmented
              label="Zoom to"
              value={activeFocus ?? 'world'}
              onChange={(v) =>
                setFocus(v === 'world' ? null : (v as ContinentCode))
              }
              options={[
                { value: 'world', label: 'World' },
                ...CONTINENT_ORDER.filter((c) => continents.has(c)).map(
                  (c) => ({
                    value: c,
                    label: CONTINENT_NAMES[c],
                  })
                ),
              ]}
            />
          )}
        </div>

        {countries.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500 dark:text-zinc-400">
            No trips in {year} yet.
          </p>
        ) : (
          <WorldMap countries={countries} mode={mode} focusCodes={focusCodes} />
        )}

        {mode === 'shade' && countries.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-zinc-400">
            <span>Days spent</span>
            {SHADE_STEPS.map((step) => (
              <span key={step.label} className="flex items-center gap-1.5">
                <svg width="12" height="12" aria-hidden="true">
                  <rect
                    width="12"
                    height="12"
                    rx="3"
                    className={step.className}
                  />
                </svg>
                {step.label}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Countries', value: countries.length },
            {
              label: 'Of the world',
              value: `${shareOfWorld(countries.length)}%`,
            },
            { label: 'Continents', value: `${continents.size}/7` },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-gray-200 bg-linear-to-br from-gray-50 to-stone-50 p-3 dark:border-white/10 dark:from-gray-950 dark:to-stone-950"
            >
              <div className="text-xs font-medium text-gray-600 sm:text-sm dark:text-gray-400">
                {stat.label}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-gray-900 sm:text-3xl dark:text-white">
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <ul className="flex flex-wrap gap-2" aria-label="Continents">
          {CONTINENT_ORDER.map((code) => {
            const count = countries.filter(
              (c) => CONTINENT_BY_COUNTRY[c.code] === code
            ).length
            return (
              <li
                key={code}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
                  count > 0
                    ? 'border-gray-900 bg-gray-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-black'
                    : 'border-gray-200 text-gray-400 dark:border-white/8 dark:text-zinc-600'
                )}
              >
                {count > 0 && <Check className="size-3" aria-hidden="true" />}
                {CONTINENT_NAMES[code]}
                {count > 0 && <span className="opacity-60">{count}</span>}
              </li>
            )
          })}
        </ul>

        <MapExportButton
          calendarData={calendarData}
          countries={countries}
          year={scope === 'year' ? year : null}
          mode={mode}
          focusCodes={focusCodes}
          variant="default"
        />
      </CardContent>
    </StandardCard>
  )
}
