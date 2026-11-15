import { trackEvent } from '@/lib/tracking'
import { orderSummary, videoFile } from '@/test/video-orders'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SaveVideoButton from './SaveVideoButton'

vi.mock('@/lib/tracking', () => ({ trackEvent: vi.fn() }))

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

const fetchMock = vi.fn()
const order = orderSummary({ videos: [videoFile('year', 'dark')] })
const video = videoFile('year', 'dark')

function setNavigator({
  userAgent,
  share,
}: {
  userAgent: string
  share?: ReturnType<typeof vi.fn>
}) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent)
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: share,
  })
  Object.defineProperty(navigator, 'canShare', {
    configurable: true,
    value: share ? () => true : undefined,
  })
}

function renderButton(freshOrder = vi.fn(async () => order)) {
  render(
    <SaveVideoButton
      order={order}
      video={video}
      freshOrder={freshOrder}
      source="dialog"
    />
  )
  return { freshOrder }
}

describe('SaveVideoButton', () => {
  const createObjectURL = vi.fn(() => 'blob:video')
  const revokeObjectURL = vi.fn()
  let anchorClick: ReturnType<typeof vi.fn<() => void>>
  const clicked = () =>
    (anchorClick.mock.contexts[0] as HTMLAnchorElement | undefined) ?? null

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        new Response(new Blob(['mp4'], { type: 'video/mp4' }), { status: 200 })
      )
    )
    vi.stubGlobal('fetch', fetchMock)
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    anchorClick = vi.fn<() => void>()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      anchorClick
    )
    vi.mocked(trackEvent).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    })
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: undefined,
    })
  })

  it('opens the share sheet with the video file on phones', async () => {
    const share = vi.fn<(data: ShareData) => Promise<void>>(() =>
      Promise.resolve()
    )
    setNavigator({ userAgent: IPHONE, share })
    renderButton()

    await userEvent.click(screen.getByRole('button', { name: 'Save video' }))

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    const files = share.mock.calls[0][0].files ?? []
    expect(files[0].name).toBe('yearly-2026-year-dark.mp4')
    expect(files[0].type).toBe('video/mp4')
    expect(fetchMock).toHaveBeenCalledWith(video.url)
    expect(trackEvent).toHaveBeenCalledWith('animated_video_saved', {
      pack: 'year',
      videoKind: 'year',
      theme: 'dark',
      method: 'share',
      source: 'dialog',
    })
  })

  it('downloads the file with a clear name on desktop', async () => {
    const { freshOrder } = renderButton()

    await userEvent.click(screen.getByRole('button', { name: 'Save video' }))

    await waitFor(() => expect(clicked()).not.toBeNull())
    expect(clicked()?.download).toBe('yearly-2026-year-dark.mp4')
    expect(clicked()?.href).toBe('blob:video')
    expect(freshOrder).toHaveBeenCalled()
    expect(trackEvent).toHaveBeenCalledWith(
      'animated_video_saved',
      expect.objectContaining({ method: 'download' })
    )
  })

  it('asks for another tap when the phone blocks the share sheet', async () => {
    const share = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('No gesture', 'NotAllowedError'))
      .mockResolvedValueOnce(undefined)
    setNavigator({ userAgent: IPHONE, share })
    renderButton()

    await userEvent.click(screen.getByRole('button', { name: 'Save video' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your video is ready. Tap Save video again.'
    )
    expect(trackEvent).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Save video' }))
    await waitFor(() => expect(share).toHaveBeenCalledTimes(2))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does nothing when the share sheet is cancelled', async () => {
    const share = vi.fn(() =>
      Promise.reject(new DOMException('Cancelled', 'AbortError'))
    )
    setNavigator({ userAgent: IPHONE, share })
    renderButton()

    await userEvent.click(screen.getByRole('button', { name: 'Save video' }))

    await waitFor(() => expect(share).toHaveBeenCalled())
    expect(clicked()).toBeNull()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('says so when the video could not be fetched', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response('', { status: 403 }))
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderButton()

    await userEvent.click(screen.getByRole('button', { name: 'Save video' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't save the video. Try again."
    )
  })
})
