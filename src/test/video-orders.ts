import type { OrderSummary, VideoSummary } from '@/lib/videos/client'

export function videoFile(
  kind: VideoSummary['kind'],
  theme: VideoSummary['theme']
): VideoSummary {
  return {
    kind,
    theme,
    url: `https://videos.test/${kind}-${theme}.mp4?token=t`,
    posterUrl: `https://videos.test/${kind}-${theme}.jpg?token=t`,
    bytes: 1000,
  }
}

export function orderSummary(
  overrides: Partial<OrderSummary> = {}
): OrderSummary {
  return {
    id: 'order-1',
    pack: 'year',
    year: 2026,
    month: null,
    status: 'paid',
    render: { version: 0, status: 'ready' },
    updatesLeft: 3,
    videos: [],
    createdAt: '2026-11-15T10:00:00.000Z',
    ...overrides,
  }
}

export const YEAR_PACK_VIDEOS = [
  videoFile('year', 'dark'),
  videoFile('year', 'light'),
  videoFile('stats', 'dark'),
  videoFile('stats', 'light'),
]

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}
