import { getDeviceType, trackEvent } from '@/lib/tracking'
import { getDeviceId } from '@/lib/tracking/device-id'
import type { WaitlistContext, WaitlistFeature } from './types'

export async function joinWaitlist(input: {
  email: string
  feature: WaitlistFeature
  context?: WaitlistContext
}): Promise<void> {
  const response = await fetch('/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      email: input.email.trim(),
      deviceId: getDeviceId(),
      deviceType: getDeviceType(),
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    const message =
      response.status === 400 || response.status === 429 ? data?.error : null
    throw new Error(message || 'Something went wrong, please try again')
  }

  trackEvent('animated_video_waitlist_join', { ...input.context })
}
