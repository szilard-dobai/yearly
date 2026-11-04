import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FeedbackDialog from './FeedbackDialog'

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
  getDeviceType: () => 'desktop',
}))

vi.mock('@/lib/tracking/device-id', () => ({
  getDeviceId: () => 'device-123',
}))

const fetchMock = vi.fn()

function renderDialog() {
  return render(
    <FeedbackDialog open onOpenChange={vi.fn()} source="feedback_button" />
  )
}

describe('FeedbackDialog', () => {
  beforeEach(() => {
    localStorage.clear()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('disables submit until a rating or message is provided', async () => {
    const user = userEvent.setup()
    renderDialog()

    const submit = screen.getByRole('button', { name: /send feedback/i })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText('Your feedback'), 'Hello')
    expect(submit).toBeEnabled()
  })

  it('submits rating and message with the device id', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 'abc' }), { status: 201 })
    )
    renderDialog()

    await user.click(screen.getByRole('radio', { name: /^5 stars/ }))
    await user.type(
      screen.getByLabelText('Your feedback'),
      'Please add a world map view'
    )
    await user.click(screen.getByRole('button', { name: /send feedback/i }))

    expect(await screen.findByText('Thank you!')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/feedback',
      expect.objectContaining({ method: 'POST' })
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toMatchObject({
      deviceId: 'device-123',
      deviceType: 'desktop',
      rating: 5,
      message: 'Please add a world map view',
      source: 'feedback_button',
    })
  })

  it('shows the server error when submission fails', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Too many submissions' }), {
        status: 429,
      })
    )
    renderDialog()

    await user.type(screen.getByLabelText('Your feedback'), 'Hi')
    await user.click(screen.getByRole('button', { name: /send feedback/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many submissions'
    )
  })
})
