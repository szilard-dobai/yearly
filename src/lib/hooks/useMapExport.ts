import { createElement, useCallback, useMemo } from 'react'
import MapExportLayout from '@/components/map/MapExportLayout'
import { EXPORT_BACKGROUND } from '@/lib/constants'
import { CONTINENT_NAMES, type ContinentCode } from '@/lib/continents'
import {
  EXPORT_CANVAS,
  EXPORT_PIXEL_RATIO,
  getMapFrameAspect,
} from '@/lib/export-canvas'
import { trackEvent } from '@/lib/tracking'
import type { MapExportSource } from '@/lib/tracking/types'
import type { DayMap } from '@/lib/trips'
import { renderMapImage } from '@/lib/world-map-image'
import {
  loadWorld,
  MAP_COLOURS,
  summariseMap,
  type MapMode,
} from '@/lib/world-map'
import {
  useExportImage,
  type ExportLayoutOptions,
  type UseExportImageReturn,
} from './useExportImage'

export interface MapExportView {
  dayMap: DayMap
  year: number | null
  mode: MapMode
  continent: ContinentCode | null
}

interface UseMapExportOptions extends MapExportView {
  source: MapExportSource
}

interface UseMapExportReturn extends Omit<UseExportImageReturn, 'start'> {
  exportMap: () => Promise<void>
  filename: string
  countryCount: number
}

function mapTitle(year: number | null, continent: ContinentCode | null) {
  if (!continent) return year === null ? 'All time' : String(year)
  return year === null
    ? CONTINENT_NAMES[continent]
    : `${CONTINENT_NAMES[continent]} ${year}`
}

export function useMapExport({
  dayMap,
  year,
  mode,
  continent,
  source,
}: UseMapExportOptions): UseMapExportReturn {
  const summary = useMemo(
    () => summariseMap(dayMap, year, continent),
    [dayMap, year, continent]
  )
  const layout = useCallback(
    async ({ format, theme }: ExportLayoutOptions) => {
      const colours = MAP_COLOURS[theme]
      const map = await renderMapImage({
        world: await loadWorld(),
        countries: summary.countries,
        mode,
        focusCodes: summary.focusCodes,
        frameAspect: getMapFrameAspect(format),
        colours,
        stroke: EXPORT_BACKGROUND[theme],
        width: EXPORT_CANVAS[format].width,
        pixelRatio: EXPORT_PIXEL_RATIO,
      })
      return createElement(MapExportLayout, {
        map,
        countries: summary.listed,
        stats: summary.stats,
        title: mapTitle(year, summary.continent),
        mode,
        format,
        colours,
      })
    },
    [summary, year, mode]
  )
  const { start, ...exportState } = useExportImage({ layout, label: 'Map' })

  const exportMap = useCallback(
    () =>
      start((format) =>
        trackEvent('map_export_click', {
          scope: year === null ? 'all' : 'year',
          year,
          mode,
          continent: summary.continent,
          countryCount: summary.listed.length,
          format,
          source,
        })
      ),
    [start, year, mode, summary, source]
  )

  const slug = summary.continent
    ? `${CONTINENT_NAMES[summary.continent].toLowerCase().replace(/ /g, '-')}-`
    : ''
  return {
    ...exportState,
    exportMap,
    filename: `my-map-${slug}${year ?? 'all-time'}.jpg`,
    countryCount: summary.listed.length,
  }
}
