import { getVideoDownloadUrl } from '@/lib/video-render/blob'
import { MAX_UPDATES } from './period'
import { updatesUsed, type VideoOrder, type VideoRender } from './orders'

export type VideoSummary = {
  kind: 'year' | 'stats' | 'month'
  theme: 'dark' | 'light'
  url: string
  bytes: number
}

export type OrderSummary = {
  id: string
  pack: VideoOrder['pack']
  year: number
  month: number | null
  status: VideoOrder['status']
  render: { version: number; status: VideoRender['status'] } | null
  updatesLeft: number
  videos: VideoSummary[]
  createdAt: string
}

export async function summarizeOrder(
  order: VideoOrder,
  renders: VideoRender[]
): Promise<OrderSummary> {
  const latest = renders.at(-1) ?? null
  const ready = renders.findLast((render) => render.status === 'ready')
  const videos = await Promise.all(
    (ready?.files ?? []).map(async (file) => ({
      kind: file.kind,
      theme: file.theme,
      bytes: file.bytes,
      url: await getVideoDownloadUrl(file.pathname),
    }))
  )
  return {
    id: order.id,
    pack: order.pack,
    year: order.year,
    month: order.month,
    status: order.status,
    render: latest && { version: latest.version, status: latest.status },
    updatesLeft: Math.max(0, MAX_UPDATES - updatesUsed(renders)),
    videos,
    createdAt: order.createdAt.toISOString(),
  }
}
