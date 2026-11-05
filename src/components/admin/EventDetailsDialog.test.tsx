import type { StoredTrackingEvent } from '@/lib/tracking/types'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import EventDetailsDialog from './EventDetailsDialog'

const event: StoredTrackingEvent = {
  _id: 'event-1',
  type: 'visit_add_attempt',
  timestamp: '2026-11-04T19:29:00Z',
  deviceId: 'ef3fd839-b42f-46ee-ae1a-525df2b90f42',
  deviceType: 'mobile',
  country: 'DE',
  region: 'BY',
  metadata: { success: true, countryCode: 'FI' },
}

function renderDialog(
  props: Partial<React.ComponentProps<typeof EventDetailsDialog>> = {}
) {
  const handlers = {
    onOpenChange: vi.fn(),
    onShowDeviceEvents: vi.fn(),
  }
  render(
    <EventDetailsDialog
      event={event}
      open
      isDeviceFiltered={false}
      {...handlers}
      {...props}
    />
  )
  return handlers
}

describe('EventDetailsDialog', () => {
  it('shows the event label, raw type, location and metadata', () => {
    renderDialog()

    expect(
      screen.getByRole('heading', { name: 'Visit add attempted' })
    ).toBeInTheDocument()
    expect(screen.getByText('visit_add_attempt')).toBeInTheDocument()
    expect(screen.getByText('DE / BY')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Germany' })).toHaveAttribute(
      'title',
      'Germany'
    )
    expect(screen.getByText('mobile')).toBeInTheDocument()
    expect(screen.getByText(event.deviceId)).toBeInTheDocument()
    expect(screen.getByText(/"countryCode": "FI"/)).toBeInTheDocument()
  })

  it('filters the table to the event device', async () => {
    const user = userEvent.setup()
    const { onShowDeviceEvents } = renderDialog()

    await user.click(
      screen.getByRole('button', { name: 'Show this device only' })
    )

    expect(onShowDeviceEvents).toHaveBeenCalledWith(event.deviceId)
  })

  it('hides the device filter when it is already applied', () => {
    renderDialog({ isDeviceFiltered: true })

    expect(
      screen.queryByRole('button', { name: 'Show this device only' })
    ).not.toBeInTheDocument()
  })

  it('says when an event has no metadata', () => {
    renderDialog({ event: { ...event, metadata: {} } })

    expect(screen.getByText('No metadata')).toBeInTheDocument()
  })
})
