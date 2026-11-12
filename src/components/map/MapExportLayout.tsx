import ExportFrame from '@/components/export/ExportFrame'
import { ExportFlag } from '@/components/export/ExportFlag'
import { CONTINENT_BY_COUNTRY } from '@/lib/continents'
import type { FlagDisplayMode } from '@/lib/contexts/SettingsContext'
import { getExportContentBox, type ExportFormat } from '@/lib/export-canvas'
import {
  EXPORT_MAP_PALETTE,
  shareOfWorld,
  type CountryDays,
  type World,
} from '@/lib/world-map'
import type { ExportTheme } from '@/lib/hooks/useExportImage'
import WorldMap, { type MapMode } from './WorldMap'

interface MapExportLayoutProps {
  world: World
  countries: CountryDays[]
  title: string
  mode: MapMode
  format: ExportFormat
  flagDisplayMode: FlagDisplayMode
  theme: ExportTheme
  focusCodes?: string[] | null
}

function flagSize(count: number, format: ExportFormat) {
  const base = count <= 12 ? 96 : count <= 24 ? 72 : count <= 48 ? 52 : 38
  return format === 'feed' ? Math.round(base * 0.8) : base
}

export default function MapExportLayout({
  world,
  countries,
  title,
  mode,
  format,
  flagDisplayMode,
  theme,
  focusCodes = null,
}: MapExportLayoutProps) {
  const content = getExportContentBox(format)
  const continents = new Set(
    countries.map((c) => CONTINENT_BY_COUNTRY[c.code]).filter(Boolean)
  )
  const size = flagSize(countries.length, format)
  const stats = [
    {
      value: countries.length,
      label: countries.length === 1 ? 'country' : 'countries',
    },
    { value: `${shareOfWorld(countries.length)}%`, label: 'of the world' },
    {
      value: continents.size,
      label: continents.size === 1 ? 'continent' : 'continents',
    },
  ]

  return (
    <ExportFrame format={format} title={title}>
      <div
        className="flex flex-col justify-between"
        style={{ height: content.height, gap: format === 'feed' ? 32 : 56 }}
      >
        <WorldMap
          world={world}
          countries={countries}
          mode={mode}
          focusCodes={focusCodes}
          interactive={false}
          palette={EXPORT_MAP_PALETTE[theme]}
        />
        <div
          className="flex flex-1 flex-wrap content-center items-center justify-center"
          style={{ gap: Math.round(size * 0.35) }}
        >
          {countries.map((country) => (
            <ExportFlag
              key={country.code}
              code={country.code}
              size={size}
              mode={flagDisplayMode}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div
                className="font-semibold tabular-nums"
                style={{
                  fontSize: format === 'feed' ? 88 : 104,
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              <div
                className="text-gray-500 dark:text-zinc-400"
                style={{ fontSize: 32, marginTop: 12 }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ExportFrame>
  )
}
