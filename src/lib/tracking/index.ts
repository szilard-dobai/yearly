/**
 * Client-side tracking utilities
 */

import { getDeviceId } from './device-id'
import type { TrackingEvent, TrackingEventType } from './types'

export * from './types'

/**
 * Track an event by sending it to the API
 */
export async function trackEvent(
  type: TrackingEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const event: TrackingEvent = {
      type,
      timestamp: new Date().toISOString(),
      deviceId: getDeviceId(),
      metadata,
    }

    // Fire and forget - don't block the UI
    fetch('/api/tracking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }).catch((error) => {
      // Silently fail - tracking should never break the app
      console.debug('Tracking failed:', error)
    })
  } catch {
    // Silently fail
    console.debug('Tracking failed')
  }
}
