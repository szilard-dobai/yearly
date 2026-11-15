export interface DeviceDeletionResult {
  deletedEvents: number
  deletedFeedback: number
}

async function adminRequest<T>(
  url: string,
  method: 'DELETE' | 'POST',
  onUnauthorized: () => void,
  failure: string
): Promise<T> {
  const response = await fetch(url, { method })
  if (response.status === 401) {
    onUnauthorized()
    throw new Error('Your admin session has expired')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error ?? failure)
  }
  return data as T
}

function adminDelete<T>(url: string, onUnauthorized: () => void): Promise<T> {
  return adminRequest<T>(url, 'DELETE', onUnauthorized, 'Failed to delete')
}

export function deleteTrackingEvent(id: string, onUnauthorized: () => void) {
  return adminDelete(`/api/tracking/${encodeURIComponent(id)}`, onUnauthorized)
}

export function deleteFeedbackEntry(id: string, onUnauthorized: () => void) {
  return adminDelete(`/api/feedback/${encodeURIComponent(id)}`, onUnauthorized)
}

export function deleteDeviceActivity(
  deviceId: string,
  onUnauthorized: () => void
) {
  return adminDelete<DeviceDeletionResult>(
    `/api/admin/devices/${encodeURIComponent(deviceId)}`,
    onUnauthorized
  )
}

export function renderVideoOrderAgain(
  orderId: string,
  onUnauthorized: () => void
) {
  return adminRequest(
    `/api/admin/video-orders/${encodeURIComponent(orderId)}/render-again`,
    'POST',
    onUnauthorized,
    'Failed to start the render'
  )
}
