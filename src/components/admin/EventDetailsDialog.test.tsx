import type { StoredTrackingEvent } from '@/lib/tracking/types'
import { render, screen, within } from '@testing-library/react'
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
    onFilterById: vi.fn(),
    onDeleteEvent: vi.fn().mockResolvedValue(undefined),
    onDeleteDevice: vi.fn().mockResolvedValue(undefined),
  }
  render(
    <EventDetailsDialog
      event={event}
      open
      idFilter=""
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
    const { onFilterById } = renderDialog()

    await user.click(
      screen.getByRole('button', { name: 'Show this device only' })
    )

    expect(onFilterById).toHaveBeenCalledWith(event.deviceId)
  })

  it('hides the device filter when it is already applied', () => {
    renderDialog({ idFilter: event.deviceId })

    expect(
      screen.queryByRole('button', { name: 'Show this device only' })
    ).not.toBeInTheDocument()
  })

  it('shows the account ID of a signed-in event and filters to it', async () => {
    const user = userEvent.setup()
    const { onFilterById } = renderDialog({
      event: { ...event, userId: 'q7Xr2mVb9LpK4sTn8WcY3hJd6FgA1zEu' },
    })

    expect(
      screen.getByText('q7Xr2mVb9LpK4sTn8WcY3hJd6FgA1zEu')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Copy user id' })
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Show this user only' })
    )

    expect(onFilterById).toHaveBeenCalledWith(
      'q7Xr2mVb9LpK4sTn8WcY3hJd6FgA1zEu'
    )
  })

  it('shows no account row for a signed-out event', () => {
    renderDialog()

    expect(screen.queryByText('User ID')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Show this user only' })
    ).not.toBeInTheDocument()
  })

  it('deletes the event after confirmation', async () => {
    const user = userEvent.setup()
    const { onDeleteEvent, onDeleteDevice } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Delete event' }))
    expect(onDeleteEvent).not.toHaveBeenCalled()

    const confirm = screen.getByRole('alertdialog', {
      name: 'Delete this event?',
    })
    await user.click(
      within(confirm).getByRole('button', { name: 'Delete event' })
    )

    expect(onDeleteEvent).toHaveBeenCalledWith(event)
    expect(onDeleteDevice).not.toHaveBeenCalled()
  })

  it('deletes all activity from the event device after confirmation', async () => {
    const user = userEvent.setup()
    const { onDeleteDevice } = renderDialog()

    await user.click(
      screen.getByRole('button', { name: 'Delete all from this device' })
    )
    await user.click(
      screen.getByRole('button', { name: 'Delete device activity' })
    )

    expect(onDeleteDevice).toHaveBeenCalledWith(event.deviceId)
  })

  it('keeps the confirmation open and shows the error when deletion fails', async () => {
    const user = userEvent.setup()
    renderDialog({
      onDeleteEvent: vi.fn().mockRejectedValue(new Error('Failed to delete')),
    })

    await user.click(screen.getByRole('button', { name: 'Delete event' }))
    const confirm = screen.getByRole('alertdialog')
    await user.click(
      within(confirm).getByRole('button', { name: 'Delete event' })
    )

    expect(await within(confirm).findByRole('alert')).toHaveTextContent(
      'Failed to delete'
    )
    expect(confirm).toBeInTheDocument()
  })

  it('says when an event has no metadata', () => {
    renderDialog({ event: { ...event, metadata: {} } })

    expect(screen.getByText('No metadata')).toBeInTheDocument()
  })
})
