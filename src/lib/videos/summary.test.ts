import { describe, expect, it, vi } from 'vitest'
import type { VideoOrder, VideoRender } from './orders'
import { summarizeOrder } from './summary'

vi.mock('@/lib/video-render/blob', () => ({
  getVideoDownloadUrl: (pathname: string) =>
    Promise.resolve(`https://signed.example/${pathname}`),
}))

const order = {
  id: 'order-1',
  pack: 'month',
  year: 2026,
  month: 5,
  status: 'paid',
  createdAt: new Date('2026-12-02T10:00:00Z'),
} as VideoOrder

function render(version: number, status: VideoRender['status'], name?: string) {
  return {
    version,
    status,
    files: name
      ? [{ kind: 'month', theme: 'dark', pathname: name, bytes: 10 }]
      : null,
  } as VideoRender
}

describe('summarizeOrder', () => {
  it('shows the newest ready videos while an update renders', async () => {
    const summary = await summarizeOrder(order, [
      render(0, 'ready'),
      render(1, 'ready', 'v1.mp4'),
      render(2, 'rendering'),
    ])

    expect(summary).toEqual({
      id: 'order-1',
      pack: 'month',
      year: 2026,
      month: 5,
      status: 'paid',
      render: { version: 2, status: 'rendering' },
      updatesLeft: 1,
      videos: [
        {
          kind: 'month',
          theme: 'dark',
          bytes: 10,
          url: 'https://signed.example/v1.mp4',
        },
      ],
      createdAt: '2026-12-02T10:00:00.000Z',
    })
  })

  it('has no videos before the first render is ready', async () => {
    const summary = await summarizeOrder(order, [render(0, 'queued')])

    expect(summary.videos).toEqual([])
    expect(summary.updatesLeft).toBe(3)
  })
})
