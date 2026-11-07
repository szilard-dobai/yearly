import { createElement, useCallback } from 'react'
import YearExportLayout from '@/components/YearExportLayout'
import { trackEvent } from '@/lib/tracking'
import { summarizeCalendar } from '@/lib/tracking/trip-summary'
import type { CalendarData } from '@/lib/types'
import {
  useExportImage,
  type ExportLayoutOptions,
  type UseExportImageReturn,
} from './useExportImage'

interface UseImageExportOptions {
  calendarData: CalendarData
  year: number
}

interface UseImageExportReturn extends Omit<UseExportImageReturn, 'start'> {
  exportImage: () => Promise<void>
  filename: string
}

export function useImageExport({
  calendarData,
  year,
}: UseImageExportOptions): UseImageExportReturn {
  const layout = useCallback(
    (options: ExportLayoutOptions) =>
      createElement(YearExportLayout, { ...options, calendarData, year }),
    [calendarData, year]
  )
  const { start, ...exportState } = useExportImage({ layout, label: 'Image' })

  const exportImage = useCallback(
    () =>
      start((format) =>
        trackEvent('image_export_click', {
          ...summarizeCalendar(calendarData, year),
          format,
        })
      ),
    [start, calendarData, year]
  )

  return { ...exportState, exportImage, filename: `my-year-${year}.jpg` }
}
