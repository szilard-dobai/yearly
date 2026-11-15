'use client'

import { isTrackingOptedOut } from '@/lib/tracking/opt-out'
import { scrubPrivateParams } from '@/lib/videos/checkout-return'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export function dropWhenOptedOut<T extends { url: string }>(
  event: T
): T | null {
  if (isTrackingOptedOut()) return null
  const url = scrubPrivateParams(event.url)
  return url === event.url ? event : { ...event, url }
}

export default function SiteAnalytics() {
  return (
    <>
      <Analytics beforeSend={dropWhenOptedOut} />
      <SpeedInsights beforeSend={dropWhenOptedOut} />
    </>
  )
}
