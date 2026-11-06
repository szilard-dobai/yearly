import type { TrackingEventType } from '@/lib/tracking/types'

export const VIDEO_OFFER_EVENTS = {
  animated_video_preview_open: 'previews',
  animated_video_buy_click: 'buyClicks',
  animated_video_waitlist_join: 'signups',
} as const satisfies Partial<Record<TrackingEventType, string>>

type FunnelStep = (typeof VIDEO_OFFER_EVENTS)[keyof typeof VIDEO_OFFER_EVENTS]

export type VideoOfferFunnelRow = { price: number } & Record<FunnelStep, number>

export type WaitlistStats = {
  total: number
  lastSevenDays: number
  funnel: VideoOfferFunnelRow[]
}

export type FunnelAggregate = {
  type: string
  price: unknown
  devices: number
}

export function buildVideoOfferFunnel(
  rows: FunnelAggregate[]
): VideoOfferFunnelRow[] {
  const byPrice = new Map<number, VideoOfferFunnelRow>()

  for (const row of rows) {
    if (
      typeof row.price !== 'number' ||
      !Object.hasOwn(VIDEO_OFFER_EVENTS, row.type)
    ) {
      continue
    }
    const step = VIDEO_OFFER_EVENTS[row.type as keyof typeof VIDEO_OFFER_EVENTS]
    const funnel = byPrice.get(row.price) ?? {
      price: row.price,
      previews: 0,
      buyClicks: 0,
      signups: 0,
    }
    funnel[step] += row.devices
    byPrice.set(row.price, funnel)
  }

  return [...byPrice.values()].sort((a, b) => a.price - b.price)
}

export function formatRate(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–'
}
