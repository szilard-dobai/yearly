import { renderExportImage } from '@/lib/export-render'
import { trackEvent } from '@/lib/tracking'
import type { CalendarData } from '@/lib/types'
import { TestWrapper } from '@/test/test-utils'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useImageExport } from './useImageExport'
import { useMonthlyExport } from './useMonthlyExport'
import { useStatisticsExport } from './useStatisticsExport'

vi.mock('@/lib/export-render', () => ({
  renderExportImage: vi.fn(
    async (_layout: ReactElement, format: string) =>
      `data:image/jpeg;base64,${format}`
  ),
}))

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
  getDeviceType: () => 'desktop',
}))

const SETTINGS_KEY = 'countries-in-year-settings'

const calendarData: CalendarData = {
  visits: [{ id: '1', countryCode: 'JP', date: new Date(2026, 5, 3) }],
}

function storedSettings() {
  return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
}

function renderedFormats() {
  return vi.mocked(renderExportImage).mock.calls.map(([layout, format]) => ({
    layoutFormat: (layout.props as { format: string }).format,
    format,
  }))
}

describe('export hooks', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(renderExportImage).mockClear()
    vi.mocked(trackEvent).mockClear()
  })

  it('exports in the remembered format and records it with the click', async () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ exportFormat: 'feed' }))
    const { result } = renderHook(
      () => useImageExport({ calendarData, year: 2026 }),
      { wrapper: TestWrapper }
    )
    await waitFor(() => expect(result.current.format).toBe('feed'))

    await act(() => result.current.exportImage())

    expect(renderedFormats()).toEqual([
      { layoutFormat: 'feed', format: 'feed' },
    ])
    expect(trackEvent).toHaveBeenCalledWith(
      'image_export_click',
      expect.objectContaining({ year: 2026, format: 'feed' })
    )
    expect(result.current.previewOpen).toBe(true)
    expect(result.current.imageDataUrl).toBe('data:image/jpeg;base64,feed')
  })

  it('falls back to the Story format when the stored format is unknown', async () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ exportFormat: 'square' })
    )
    const { result } = renderHook(
      () => useImageExport({ calendarData, year: 2026 }),
      { wrapper: TestWrapper }
    )

    await act(() => result.current.exportImage())

    expect(renderedFormats()).toEqual([
      { layoutFormat: 'story', format: 'story' },
    ])
  })

  it('switches format without counting another export and remembers it', async () => {
    const { result } = renderHook(
      () => useStatisticsExport({ calendarData, year: 2026 }),
      { wrapper: TestWrapper }
    )

    await act(() => result.current.exportStatistics())
    await act(() => result.current.changeFormat('feed'))

    expect(renderedFormats()).toEqual([
      { layoutFormat: 'story', format: 'story' },
      { layoutFormat: 'feed', format: 'feed' },
    ])
    expect(trackEvent).toHaveBeenCalledTimes(1)
    expect(trackEvent).toHaveBeenCalledWith('statistics_export_click', {
      year: 2026,
      visitCount: 1,
      format: 'story',
    })
    expect(result.current.format).toBe('feed')
    expect(result.current.imageDataUrl).toBe('data:image/jpeg;base64,feed')
    await waitFor(() => expect(storedSettings().exportFormat).toBe('feed'))
  })

  it('records the month, source and format of a month export', async () => {
    const { result } = renderHook(
      () => useMonthlyExport({ calendarData, year: 2026, month: 5 }),
      { wrapper: TestWrapper }
    )

    await act(() => result.current.exportMonth('header'))

    expect(trackEvent).toHaveBeenCalledWith('monthly_export_click', {
      year: 2026,
      month: 5,
      source: 'header',
      format: 'story',
    })
    expect(result.current.filename).toBe('my-month-june-2026.jpg')
  })
})
