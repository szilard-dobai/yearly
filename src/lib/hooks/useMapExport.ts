import { createElement, useCallback } from 'react'
import MapExportLayout from '@/components/map/MapExportLayout'
import { EXPORT_BACKGROUND } from '@/lib/constants'
import { EXPORT_PIXEL_RATIO, getExportContentBox } from '@/lib/export-canvas'
import { trackEvent } from '@/lib/tracking'
import type { MapExportSource } from '@/lib/tracking/types'
import { renderMapImage } from '@/lib/world-map-image'
import {
  loadWorld,
  MAP_COLOURS,
  type CountryDays,
  type MapMode,
} from '@/lib/world-map'
import {
  useExportImage,
  type ExportLayoutOptions,
  type UseExportImageReturn,
} from './useExportImage'

export interface MapExportView {
  countries: CountryDays[]
  year: number | null
  mode: MapMode
  focusCodes: string[] | null
}

interface UseMapExportOptions extends MapExportView {
  source: MapExportSource
}

interface UseMapExportReturn extends Omit<UseExportImageReturn, 'start'> {
  exportMap: () => Promise<void>
  filename: string
}

export function useMapExport({
  countries,
  year,
  mode,
  focusCodes,
  source,
}: UseMapExportOptions): UseMapExportReturn {
  const layout = useCallback(
    async ({ format, theme }: ExportLayoutOptions) => {
      const colours = MAP_COLOURS[theme]
      const map = await renderMapImage({
        world: await loadWorld(),
        countries,
        mode,
        focusCodes,
        colours,
        stroke: EXPORT_BACKGROUND[theme],
        width: getExportContentBox(format).width,
        pixelRatio: EXPORT_PIXEL_RATIO,
      })
      return createElement(MapExportLayout, {
        map,
        countries,
        title: year === null ? 'All time' : String(year),
        mode,
        format,
        colours,
      })
    },
    [countries, year, mode, focusCodes]
  )
  const { start, ...exportState } = useExportImage({ layout, label: 'Map' })

  const exportMap = useCallback(
    () =>
      start((format) =>
        trackEvent('map_export_click', {
          scope: year === null ? 'all' : 'year',
          year,
          mode,
          zoomed: focusCodes !== null,
          countryCount: countries.length,
          format,
          source,
        })
      ),
    [start, year, mode, focusCodes, countries.length, source]
  )

  return {
    ...exportState,
    exportMap,
    filename: `my-map-${year ?? 'all-time'}.jpg`,
  }
}
