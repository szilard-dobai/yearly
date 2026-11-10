import { trackEvent } from '@/lib/tracking'
import { render, screen, waitFor, within } from '@testing-library/react'
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
    render(
      <FeedbackPrompt
        source="post_export"
        context={context}
        onDismiss={vi.fn()}
      />
    )

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
      'Anything we could add or improve? (optional)'
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
    render(
      <FeedbackPrompt
        source="post_export"
        context={context}
        onDismiss={vi.fn()}
      />
    )

    await user.click(screen.getByRole('radio', { name: /^2 stars/ }))

    const chips = await screen.findByRole('group', {
      name: 'Sorry to hear that. What went wrong?',
    })
    expect(
      within(chips)
        .getAllByRole('button')
        .map((chip) => chip.textContent)
    ).toEqual([
      'Adding trips is fiddly',
      "Export doesn't look right",
      'Missing a feature',
      "Something's broken",
    ])
  })

  it('offers praise chips for high ratings', async () => {
    const user = userEvent.setup()
    fetchMock.mockReturnValue(jsonResponse({ id: 'feedback-1' }, 201))
    render(
      <FeedbackPrompt
        source="post_export"
        context={context}
        onDismiss={vi.fn()}
      />
    )

    await user.click(screen.getByRole('radio', { name: /^5 stars/ }))

    const chips = await screen.findByRole('group', {
      name: 'Glad you like it! What stood out?',
    })
    expect(within(chips).getAllByRole('button')).toHaveLength(4)
    expect(
      within(chips).getByRole('button', { name: 'Love the stats' })
    ).toBeInTheDocument()
  })

  it('sends quick-reply chips without a typed message', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockReturnValueOnce(jsonResponse({ id: 'feedback-1' }, 201))
      .mockReturnValueOnce(jsonResponse({ success: true }))
    render(
      <FeedbackPrompt
        source="post_export"
        context={context}
        onDismiss={vi.fn()}
      />
    )

    await user.click(screen.getByRole('radio', { name: /^2 stars/ }))
    const send = await screen.findByRole('button', { name: 'Send' })
    expect(send).toBeDisabled()

    const fiddly = screen.getByRole('button', {
      name: 'Adding trips is fiddly',
    })
    const broken = screen.getByRole('button', { name: "Something's broken" })
    await user.click(fiddly)
    await user.click(broken)
    await user.click(fiddly)

    expect(fiddly).toHaveAttribute('aria-pressed', 'false')
    expect(broken).toHaveAttribute('aria-pressed', 'true')
    expect(send).toBeEnabled()

    await user.click(send)

    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/feedback/feedback-1',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(requestBody(1)).toMatchObject({ tags: ['bug'] })
    expect(requestBody(1).message).toBeUndefined()
  })

  it('reports where the rating came from', async () => {
    const user = userEvent.setup()
    const onRate = vi.fn()
    fetchMock.mockReturnValue(jsonResponse({ id: 'feedback-1' }, 201))
    render(
      <FeedbackPrompt
        source="create_card"
        context={{ year: 2026 }}
        title="How's Yearly so far?"
        onRate={onRate}
        onDismiss={vi.fn()}
      />
    )

    expect(screen.getByText("How's Yearly so far?")).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /^4 stars/ }))

    expect(onRate).toHaveBeenCalled()
    expect(requestBody(0)).toMatchObject({
      rating: 4,
      source: 'create_card',
      context: { year: 2026 },
    })
  })

  it('submits rating and message together if saving the rating failed', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockReturnValueOnce(jsonResponse({ error: 'down' }, 500))
      .mockReturnValueOnce(jsonResponse({ id: 'feedback-2' }, 201))
    render(
      <FeedbackPrompt
        source="post_export"
        context={context}
        onDismiss={vi.fn()}
      />
    )

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
    render(
      <FeedbackPrompt
        source="post_export"
        context={context}
        onDismiss={onDismiss}
      />
    )

    await user.click(
      screen.getByRole('button', { name: 'Dismiss feedback prompt' })
    )

    expect(onDismiss).toHaveBeenCalled()
    expect(trackEvent).toHaveBeenCalledWith('feedback_prompt_dismissed', {
      ...context,
      source: 'post_export',
    })
    expect(
      JSON.parse(localStorage.getItem('yearly_feedback_prompt') ?? '{}')
    ).toHaveProperty('dismissedAt')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('finishes without a message when skipped', async () => {
    const user = userEvent.setup()
    fetchMock.mockReturnValue(jsonResponse({ id: 'feedback-1' }, 201))
    render(
      <FeedbackPrompt
        source="post_export"
        context={context}
        onDismiss={vi.fn()}
      />
    )

    await user.click(screen.getByRole('radio', { name: /^5 stars/ }))
    await user.click(await screen.findByRole('button', { name: 'Skip' }))

    expect(await screen.findByRole('status')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })
})
