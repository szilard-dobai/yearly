import { createElement, useCallback } from 'react'
import StatisticsExportLayout from '@/components/StatisticsExportLayout'
import { trackEvent } from '@/lib/tracking'
import type { CalendarData } from '@/lib/types'
import {
  useExportImage,
  type ExportLayoutOptions,
  type UseExportImageReturn,
} from './useExportImage'

interface UseStatisticsExportOptions {
  calendarData: CalendarData
  year: number
}

interface UseStatisticsExportReturn extends Omit<
  UseExportImageReturn,
  'start'
> {
  exportStatistics: () => Promise<void>
  filename: string
}

export function useStatisticsExport({
  calendarData,
  year,
}: UseStatisticsExportOptions): UseStatisticsExportReturn {
  const layout = useCallback(
    ({ format, flagDisplayMode }: ExportLayoutOptions) =>
      createElement(StatisticsExportLayout, {
        calendarData,
        year,
        format,
        flagDisplayMode,
      }),
    [calendarData, year]
  )
  const { start, ...exportState } = useExportImage({
    layout,
    label: 'Statistics',
  })

  const exportStatistics = useCallback(
    () =>
      start((format) =>
        trackEvent('statistics_export_click', {
          year,
          visitCount: calendarData.visits.length,
          format,
        })
      ),
    [start, calendarData, year]
  )

  return { ...exportState, exportStatistics, filename: `my-stats-${year}.jpg` }
}
