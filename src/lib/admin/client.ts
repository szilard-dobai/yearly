export interface DeviceDeletionResult {
  deletedEvents: number
  deletedFeedback: number
}

async function adminDelete<T>(
  url: string,
  onUnauthorized: () => void
): Promise<T> {
  const response = await fetch(url, { method: 'DELETE' })
  if (response.status === 401) {
    onUnauthorized()
    throw new Error('Your admin session has expired')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to delete')
  }
  return data as T
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
