'use client'

import ChoiceChip from '@/components/ChoiceChip'
import { CONTINENT_NAMES, type ContinentCode } from '@/lib/continents'
import type { MapExportView } from '@/lib/hooks/useMapExport'
import { useNearViewport } from '@/lib/hooks/useNearViewport'
import { useResolvedColorScheme } from '@/lib/hooks/useResolvedColorScheme'
import { trackEvent } from '@/lib/tracking'
import type { DayMap } from '@/lib/trips'
import { cn } from '@/lib/utils'
import {
  codesInContinent,
  CONTINENT_ORDER,
  loadWorld,
  MAP_COLOURS,
  SHADE_STEPS,
  summariseMap,
  type MapMode,
  type World,
} from '@/lib/world-map'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import WorldMap from './WorldMap'

type Scope = 'year' | 'all'

function useWorld(enabled: boolean) {
  const [world, setWorld] = useState<World | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!enabled) return
    let active = true
    loadWorld().then(
      (loaded) => active && setWorld(loaded),
      () => active && setFailed(true)
    )
    return () => {
      active = false
    }
  }, [enabled])
  return { world, failed }
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
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
          onClick={() => value !== option.value && onChange(option.value)}
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

interface WorldMapPanelProps {
  dayMap: DayMap
  year: number | null
  source: 'create' | 'account'
  actions?: (view: MapExportView) => ReactNode
}

export default function WorldMapPanel({
  dayMap,
  year,
  source,
  actions,
}: WorldMapPanelProps) {
  const { ref, isNear } = useNearViewport<HTMLDivElement>()
  const { world, failed } = useWorld(isNear)
  const colorScheme = useResolvedColorScheme()
  const [scope, setScope] = useState<Scope>('year')
  const [mode, setMode] = useState<MapMode>('flags')
  const [focus, setFocus] = useState<ContinentCode | null>(null)

  const scopeYear = year !== null && scope === 'year' ? year : null
  const {
    countries,
    continent: activeFocus,
    focusCodes,
    stats,
  } = useMemo(
    () => summariseMap(dayMap, scopeYear, focus),
    [dayMap, scopeYear, focus]
  )
  const view = useMemo(
    () => ({ dayMap, year: scopeYear, mode, continent: activeFocus }),
    [dayMap, scopeYear, mode, activeFocus]
  )

  const track = (change: 'scope' | 'mode' | 'zoom', value: string) =>
    trackEvent('map_view_change', { change, value, source })

  const colours = colorScheme ? MAP_COLOURS[colorScheme] : null

  return (
    <div ref={ref} className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {year !== null && (
          <Segmented
            label="Which trips"
            value={scope}
            onChange={(next) => {
              setScope(next)
              track('scope', next)
            }}
            options={[
              { value: 'year', label: String(year) },
              { value: 'all', label: 'All time' },
            ]}
          />
        )}
        <Segmented
          label="Fill countries with"
          value={mode}
          onChange={(next) => {
            setMode(next)
            track('mode', next)
          }}
          options={[
            { value: 'flags', label: 'Flags' },
            { value: 'shade', label: 'By days' },
          ]}
        />
      </div>

      {countries.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500 dark:text-zinc-400">
          No trips in {year} yet.
        </p>
      ) : failed ? (
        <p className="py-10 text-center text-sm text-gray-500 dark:text-zinc-400">
          The map didn&apos;t load. Check your connection and reload the page.
        </p>
      ) : world && colours ? (
        <WorldMap
          world={world}
          countries={countries}
          mode={mode}
          focusCodes={focusCodes}
          colours={colours}
        />
      ) : (
        <div
          role="status"
          aria-label="Loading the map"
          className="aspect-960/430 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-white/5"
        />
      )}

      {mode === 'shade' && colours && countries.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-zinc-400">
          <span>Days spent</span>
          {SHADE_STEPS.map((step, i) => (
            <span key={step.label} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-3 rounded-[3px]"
                style={{ backgroundColor: colours.shade[i] }}
              />
              {step.label}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-gray-200 bg-linear-to-br from-gray-50 to-stone-50 p-3 dark:border-white/10 dark:from-gray-950 dark:to-stone-950"
          >
            <div className="text-xs font-medium text-gray-600 sm:text-sm dark:text-gray-400">
              {stat.label}
            </div>
            <div className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums sm:text-3xl dark:text-white">
              {stat.value}
              {stat.unit && (
                <span className="ml-1 text-sm font-normal text-gray-500 sm:text-base dark:text-zinc-400">
                  {stat.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        role="group"
        aria-label="Zoom to a continent"
        className="flex flex-wrap gap-2"
      >
        <ChoiceChip
          selected={activeFocus === null}
          aria-pressed={activeFocus === null}
          onClick={() => {
            if (activeFocus === null) return
            setFocus(null)
            track('zoom', 'world')
          }}
        >
          World
        </ChoiceChip>
        {CONTINENT_ORDER.map((code) => {
          const count = codesInContinent(countries, code).length
          return (
            <ChoiceChip
              key={code}
              selected={activeFocus === code}
              aria-pressed={activeFocus === code}
              disabled={count === 0}
              className="disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#141414]"
              onClick={() => {
                if (activeFocus === code) return
                setFocus(code)
                track('zoom', code)
              }}
            >
              {CONTINENT_NAMES[code]}
              {count > 0 && (
                <>
                  {' '}
                  <span className="opacity-60">{count}</span>
                </>
              )}
            </ChoiceChip>
          )
        })}
      </div>

      {actions?.(view)}
    </div>
  )
}
