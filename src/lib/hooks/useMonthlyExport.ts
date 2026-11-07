import { createElement, useCallback } from 'react'
import MonthlyExportLayout from '@/components/MonthlyExportLayout'
import { MONTH_NAMES } from '@/lib/constants'
import { trackEvent } from '@/lib/tracking'
import type { CalendarData } from '@/lib/types'
import {
  useExportImage,
  type ExportLayoutOptions,
  type UseExportImageReturn,
} from './useExportImage'

interface UseMonthlyExportOptions {
  calendarData: CalendarData
  year: number
  month: number
}

type ExportSource = 'sidebar' | 'header' | 'mobile_fab'

interface UseMonthlyExportReturn extends Omit<UseExportImageReturn, 'start'> {
  exportMonth: (source?: ExportSource) => Promise<void>
  filename: string
}

export function useMonthlyExport({
  calendarData,
  year,
  month,
}: UseMonthlyExportOptions): UseMonthlyExportReturn {
  const layout = useCallback(
    (options: ExportLayoutOptions) =>
      createElement(MonthlyExportLayout, {
        ...options,
        calendarData,
        year,
        month,
      }),
    [calendarData, year, month]
  )
  const { start, ...exportState } = useExportImage({ layout, label: 'Monthly' })

  const exportMonth = useCallback(
    (source: ExportSource = 'sidebar') =>
      start((format) =>
        trackEvent('monthly_export_click', { year, month, source, format })
      ),
    [start, year, month]
  )

  return {
    ...exportState,
    exportMonth,
    filename: `my-month-${MONTH_NAMES[month].toLowerCase()}-${year}.jpg`,
  }
}
