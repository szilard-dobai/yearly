import { trackEvent } from '@/lib/tracking'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FeedbackPrompt from './FeedbackPrompt'

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
  getDeviceType: () => 'mobile',
}))

vi.mock('@/lib/tracking/device-id', () => ({
  getDeviceId: () => 'device-123',
}))

const fetchMock = vi.fn()
const context = { exportType: 'calendar' as const, year: 2026 }

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

function requestBody(call: number) {
  return JSON.parse(fetchMock.mock.calls[call][1].body)
}

describe('FeedbackPrompt', () => {
  beforeEach(() => {
    localStorage.clear()
    fetchMock.mockReset()
    vi.mocked(trackEvent).mockClear()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('saves the rating immediately, then attaches the follow-up message', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockReturnValueOnce(jsonResponse({ id: 'feedback-1' }, 201))
      .mockReturnValueOnce(jsonResponse({ success: true }))
    render(<FeedbackPrompt context={context} onDismiss={vi.fn()} />)

    await user.click(screen.getByRole('radio', { name: /^4 stars/ }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/feedback',
      expect.objectContaining({ method: 'POST' })
    )
    expect(requestBody(0)).toMatchObject({
      rating: 4,
      message: null,
      source: 'post_export',
      context,
    })

    const textarea = await screen.findByLabelText(
      'Glad you like it! Anything we could add or improve?'
    )
    await user.type(textarea, 'More export sizes')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Thanks for the feedback!'
    )
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/feedback/feedback-1',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(requestBody(1)).toMatchObject({
      deviceId: 'device-123',
      message: 'More export sizes',
    })
  })

  it('asks what went wrong for low ratings', async () => {
    const user = userEvent.setup()
    fetchMock.mockReturnValue(jsonResponse({ id: 'feedback-1' }, 201))
    render(<FeedbackPrompt context={context} onDismiss={vi.fn()} />)

    await user.click(screen.getByRole('radio', { name: /^2 stars/ }))

    expect(
      await screen.findByLabelText(
        'Sorry to hear that. What could we do better?'
      )
    ).toBeInTheDocument()
  })

  it('submits rating and message together if saving the rating failed', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockReturnValueOnce(jsonResponse({ error: 'down' }, 500))
      .mockReturnValueOnce(jsonResponse({ id: 'feedback-2' }, 201))
    render(<FeedbackPrompt context={context} onDismiss={vi.fn()} />)

    await user.click(screen.getByRole('radio', { name: /^5 stars/ }))
    await user.type(
      await screen.findByRole('textbox'),
      'Love the flags, please add a map'
    )
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/feedback',
      expect.objectContaining({ method: 'POST' })
    )
    expect(requestBody(1)).toMatchObject({
      rating: 5,
      message: 'Love the flags, please add a map',
    })
  })

  it('records the dismissal and hides the prompt', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<FeedbackPrompt context={context} onDismiss={onDismiss} />)

    await user.click(
      screen.getByRole('button', { name: 'Dismiss feedback prompt' })
    )

    expect(onDismiss).toHaveBeenCalled()
    expect(trackEvent).toHaveBeenCalledWith(
      'feedback_prompt_dismissed',
      context
    )
    expect(
      JSON.parse(localStorage.getItem('yearly_feedback_prompt') ?? '{}')
    ).toHaveProperty('dismissedAt')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('finishes without a message when skipped', async () => {
    const user = userEvent.setup()
    fetchMock.mockReturnValue(jsonResponse({ id: 'feedback-1' }, 201))
    render(<FeedbackPrompt context={context} onDismiss={vi.fn()} />)

    await user.click(screen.getByRole('radio', { name: /^5 stars/ }))
    await user.click(await screen.findByRole('button', { name: 'Skip' }))

    expect(await screen.findByRole('status')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })
})
