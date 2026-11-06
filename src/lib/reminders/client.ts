import { getDeviceType, trackEvent } from '@/lib/tracking'
import { getDeviceId } from '@/lib/tracking/device-id'
import type { CalendarProvider } from './types'

export function recordCalendarReminder(input: {
  year: number
  provider: CalendarProvider
}): void {
  try {
    fetch('/api/reminders/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        deviceId: getDeviceId(),
        deviceType: getDeviceType(),
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}

export async function createYearEndReminder(input: {
  email: string
  year: number
}): Promise<void> {
  const response = await fetch('/api/reminders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: input.email.trim(),
      year: input.year,
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

  trackEvent('year_end_reminder_email_submit', { year: input.year })
}
