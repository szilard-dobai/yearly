/**
 * Generate and persist a unique device ID for tracking
 * This is NOT personally identifiable - just a random UUID
 */

const DEVICE_ID_KEY = 'yearly_device_id'

function generateDeviceId(): string {
  // Use crypto.randomUUID if available, otherwise fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server'
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY)

  if (!deviceId) {
    deviceId = generateDeviceId()
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }

  return deviceId
}
