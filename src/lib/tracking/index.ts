/**
 * Client-side tracking utilities
 */

import { getDeviceId } from './device-id'
import type { DeviceType, TrackingEvent, TrackingEventType } from './types'

export * from './types'

function getDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop'

  const ua = navigator?.userAgent
  if (ua) {
    // Check for tablets first (before mobile, as some tablets include mobile keywords)
    if (/iPad|Android(?!.*Mobile)|tablet/i.test(ua)) {
      return 'tablet'
    }
    // Check for mobile devices
    if (/iPhone|iPod|Android.*Mobile|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)) {
      return 'mobile'
    }
    return 'desktop'
  }

  // Fallback to screen width if no userAgent
  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

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
      deviceType: getDeviceType(),
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
