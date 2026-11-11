import type { ExportFormat } from '@/lib/export-canvas'
import type { ExportType } from '@/lib/feedback/types'
import { trackEvent } from '@/lib/tracking'
import type { CalendarData } from '@/lib/types'
import { getAnimatedVideoPrice } from '@/lib/video-offer'
import { render, screen, waitFor, within } from '@testing-library/react'
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

function renderModal(
  exportType: ExportType,
  year = 2026,
  month?: number,
  format: ExportFormat = 'story',
  { onFormatChange = vi.fn(), isRendering = false } = {}
) {
  return render(
    <ImagePreviewModal
      open
      onOpenChange={vi.fn()}
      imageDataUrl="data:image/jpeg;base64,AAAA"
      filename="yearly.jpg"
      year={year}
      month={month}
      calendarData={calendarData}
      exportType={exportType}
      format={format}
      onFormatChange={onFormatChange}
      isRendering={isRendering}
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

  it('offers the month video for a monthly export with trips', async () => {
    const user = userEvent.setup()
    renderModal('monthly', 2026, 2)

    await user.click(screen.getByRole('button', { name: /Make it a video/ }))

    expect(screen.getByText(/Watch your month fill up/)).toBeInTheDocument()
    expect(trackEvent).toHaveBeenCalledWith('animated_video_preview_open', {
      exportType: 'monthly',
      year: 2026,
      month: 2,
      price: getAnimatedVideoPrice('device-123'),
      entry: 'card',
    })
  })

  it('does not offer a video for a month without trips', () => {
    renderModal('monthly', 2026, 3)

    expect(
      screen.queryByRole('button', { name: /Make it a video/ })
    ).not.toBeInTheDocument()
  })

  it('does not offer a video for a year without trips', () => {
    renderModal('calendar', 2025)

    expect(
      screen.queryByRole('button', { name: /Make it a video/ })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'See it animated' })
    ).not.toBeInTheDocument()
  })

  it('records the download and its format without sending any trip dates', async () => {
    const user = userEvent.setup()
    renderModal('calendar', 2026, undefined, 'feed')

    await user.click(screen.getByRole('button', { name: /Download Image/ }))

    expect(trackEvent).toHaveBeenCalledWith('image_download_click', {
      exportType: 'calendar',
      year: 2026,
      dayCount: 1,
      tripCount: 1,
      countryCount: 1,
      countries: [{ code: 'JP', days: 1 }],
      format: 'feed',
    })
  })

  it('shares the image with a tagged link on mobile', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.yearly.world')
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'
    )
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', {
      value: share,
      configurable: true,
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Blob(['image'], { type: 'image/jpeg' }))
    )
    const user = userEvent.setup()
    renderModal('calendar')

    try {
      await user.click(screen.getByRole('button', { name: /Download Image/ }))

      await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
      expect(share.mock.calls[0][0]).toMatchObject({
        text: 'Made with Yearly: https://www.yearly.world/?utm_source=share',
      })
    } finally {
      vi.unstubAllEnvs()
      vi.restoreAllMocks()
      Reflect.deleteProperty(navigator, 'share')
    }
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
      entry: 'card',
    })
  })

  it('opens the preview from under the image and records where it came from', async () => {
    const user = userEvent.setup()
    renderModal('statistics')

    await user.click(screen.getByRole('button', { name: 'See it animated' }))

    expect(await screen.findByTestId('video-dialog')).toBeInTheDocument()
    expect(trackEvent).toHaveBeenCalledWith('animated_video_preview_open', {
      exportType: 'statistics',
      year: 2026,
      price: getAnimatedVideoPrice('device-123'),
      entry: 'preview_image',
    })
  })
})

describe('ImagePreviewModal format picker', () => {
  it('marks the current format and switches to the other one', async () => {
    const user = userEvent.setup()
    const onFormatChange = vi.fn()
    renderModal('statistics', 2026, undefined, 'story', { onFormatChange })

    const group = screen.getByRole('group', { name: 'Image format' })
    const story = within(group).getByRole('button', { name: /Story/ })
    const feed = within(group).getByRole('button', { name: /Feed/ })

    expect(story).toHaveAttribute('aria-pressed', 'true')
    expect(feed).toHaveAttribute('aria-pressed', 'false')

    await user.click(story)
    expect(onFormatChange).not.toHaveBeenCalled()

    await user.click(feed)
    expect(onFormatChange).toHaveBeenCalledWith('feed')
  })

  it('locks the picker and the download while the new image renders', () => {
    renderModal('monthly', 2026, 2, 'feed', { isRendering: true })

    expect(screen.getByRole('button', { name: /Story/ })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /Download Image/ })
    ).toBeDisabled()
  })
})
