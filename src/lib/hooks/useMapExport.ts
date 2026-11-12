import { createElement, useCallback, useRef } from 'react'
import MapExportLayout from '@/components/map/MapExportLayout'
import type { MapMode } from '@/components/map/WorldMap'
import { trackEvent } from '@/lib/tracking'
import { loadWorld, type CountryDays, type World } from '@/lib/world-map'
import {
  useExportImage,
  type ExportLayoutOptions,
  type UseExportImageReturn,
} from './useExportImage'

interface UseMapExportOptions {
  countries: CountryDays[]
  year: number | null
  mode: MapMode
  focusCodes?: string[] | null
}

interface UseMapExportReturn extends Omit<UseExportImageReturn, 'start'> {
  exportMap: () => Promise<void>
  filename: string
}

export function useMapExport({
  countries,
  year,
  mode,
  focusCodes = null,
}: UseMapExportOptions): UseMapExportReturn {
  const worldRef = useRef<World | null>(null)
  const layout = useCallback(
    ({ format, flagDisplayMode, theme }: ExportLayoutOptions) => {
      if (!worldRef.current) throw new Error('Map data is not loaded yet')
      return createElement(MapExportLayout, {
        world: worldRef.current,
        countries,
        title: year === null ? 'All time' : String(year),
        mode,
        format,
        flagDisplayMode,
        theme,
        focusCodes,
      })
    },
    [countries, year, mode, focusCodes]
  )
  const { start, ...exportState } = useExportImage({ layout, label: 'Map' })

  const exportMap = useCallback(async () => {
    worldRef.current = await loadWorld()
    await start((format) =>
      trackEvent('map_export_click', {
        scope: year === null ? 'all' : 'year',
        year,
        mode,
        zoomed: focusCodes !== null,
        countryCount: countries.length,
        format,
      })
    )
  }, [start, year, mode, focusCodes, countries.length])

  return {
    ...exportState,
    exportMap,
    filename: `my-map-${year ?? 'all-time'}.jpg`,
  }
}
