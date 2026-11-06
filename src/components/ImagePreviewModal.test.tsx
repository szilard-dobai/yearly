import type { ExportType } from '@/lib/feedback/types'
import { trackEvent } from '@/lib/tracking'
import type { CalendarData } from '@/lib/types'
import { getAnimatedVideoPrice } from '@/lib/video-offer'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ImagePreviewModal from './ImagePreviewModal'

vi.mock('./AnimatedVideoDialog', () => ({
  default: ({ open, price }: { open: boolean; price: number }) =>
    open ? <div data-testid="video-dialog" data-price={price} /> : null,
}))

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
  getDeviceType: () => 'desktop',
}))

vi.mock('@/lib/tracking/device-id', () => ({
  getDeviceId: () => 'device-123',
}))

const calendarData: CalendarData = {
  visits: [{ id: '1', countryCode: 'JP', date: new Date(2026, 2, 20) }],
}

function renderModal(exportType: ExportType, year = 2026) {
  return render(
    <ImagePreviewModal
      open
      onOpenChange={vi.fn()}
      imageDataUrl="data:image/jpeg;base64,AAAA"
      filename="yearly.jpg"
      year={year}
      calendarData={calendarData}
      exportType={exportType}
    />
  )
}

describe('ImagePreviewModal video offer', () => {
  beforeEach(() => {
    vi.mocked(trackEvent).mockClear()
  })

  it.each<ExportType>(['calendar', 'statistics'])(
    'offers the animated version of the %s export',
    (exportType) => {
      renderModal(exportType)

      expect(
        screen.getByRole('button', { name: /Make it a video/ })
      ).toBeInTheDocument()
    }
  )

  it('does not offer a video for monthly exports', () => {
    renderModal('monthly')

    expect(
      screen.queryByRole('button', { name: /Make it a video/ })
    ).not.toBeInTheDocument()
  })

  it('does not offer a video for a year without trips', () => {
    renderModal('calendar', 2025)

    expect(
      screen.queryByRole('button', { name: /Make it a video/ })
    ).not.toBeInTheDocument()
  })

  it('records the download without sending any trip dates', async () => {
    const user = userEvent.setup()
    renderModal('calendar')

    await user.click(screen.getByRole('button', { name: /Download Image/ }))

    expect(trackEvent).toHaveBeenCalledWith('image_download_click', {
      exportType: 'calendar',
      year: 2026,
      visitCount: 1,
      dayCount: 1,
      countryCount: 1,
      countries: [{ code: 'JP', days: 1 }],
    })
  })

  it('opens the preview with the device price and records it', async () => {
    const user = userEvent.setup()
    renderModal('calendar')

    await user.click(screen.getByRole('button', { name: /Make it a video/ }))

    const price = getAnimatedVideoPrice('device-123')
    expect(await screen.findByTestId('video-dialog')).toHaveAttribute(
      'data-price',
      String(price)
    )
    expect(trackEvent).toHaveBeenCalledWith('animated_video_preview_open', {
      exportType: 'calendar',
      year: 2026,
      price,
    })
  })
})
