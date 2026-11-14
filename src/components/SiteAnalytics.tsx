'use client'

import { isTrackingOptedOut } from '@/lib/tracking/opt-out'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export function dropWhenOptedOut<T>(event: T): T | null {
  return isTrackingOptedOut() ? null : event
}

export default function SiteAnalytics() {
  return (
    <>
      <Analytics beforeSend={dropWhenOptedOut} />
      <SpeedInsights beforeSend={dropWhenOptedOut} />
    </>
  )
}
