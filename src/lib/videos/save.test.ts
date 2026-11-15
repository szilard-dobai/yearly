import { describe, expect, it, vi } from 'vitest'
import { saveMethod, videoFilename } from './save'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'

function fakeNavigator(
  userAgent: string,
  {
    canShare,
    maxTouchPoints = 0,
  }: { canShare?: boolean; maxTouchPoints?: number }
) {
  return {
    userAgent,
    maxTouchPoints,
    ...(canShare !== undefined && { canShare: vi.fn(() => canShare) }),
  } as unknown as Navigator
}

describe('videoFilename', () => {
  it('names year pack files by year, video and theme', () => {
    expect(
      videoFilename(
        { pack: 'year', year: 2026, month: null },
        { kind: 'stats', theme: 'dark' }
      )
    ).toBe('yearly-2026-stats-dark.mp4')
  })

  it('names month pack files by month and theme', () => {
    expect(
      videoFilename(
        { pack: 'month', year: 2026, month: 2 },
        { kind: 'month', theme: 'light' }
      )
    ).toBe('yearly-2026-march-light.mp4')
  })
})

describe('saveMethod', () => {
  it('shares on phones that can share video files', () => {
    const nav = fakeNavigator(IPHONE, { canShare: true })
    expect(saveMethod(nav)).toBe('share')
    expect(nav.canShare).toHaveBeenCalledWith({
      files: [expect.any(File)],
    })
  })

  it('downloads on phones that cannot share files', () => {
    expect(saveMethod(fakeNavigator(IPHONE, { canShare: false }))).toBe(
      'download'
    )
    expect(saveMethod(fakeNavigator(IPHONE, {}))).toBe('download')
  })

  it('downloads on desktop even when the browser can share', () => {
    expect(saveMethod(fakeNavigator(MAC, { canShare: true }))).toBe('download')
  })

  it('treats an iPad asking for the desktop site as a tablet', () => {
    expect(
      saveMethod(fakeNavigator(MAC, { canShare: true, maxTouchPoints: 5 }))
    ).toBe('share')
  })
})
