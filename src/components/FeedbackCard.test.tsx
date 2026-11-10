import { markFeedbackSubmitted } from '@/lib/feedback/prompt'
import { trackEvent } from '@/lib/tracking'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FeedbackCard from './FeedbackCard'

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
  getDeviceType: () => 'mobile',
}))

vi.mock('@/lib/tracking/device-id', () => ({
  getDeviceId: () => 'device-123',
}))

const TITLE = "How's Yearly so far?"
const fetchMock = vi.fn()

function shownEvents() {
  return vi
    .mocked(trackEvent)
    .mock.calls.filter(([type]) => type === 'feedback_prompt_shown')
}

describe('FeedbackCard', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(trackEvent).mockClear()
    fetchMock
      .mockReset()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 'feedback-1' }), { status: 201 })
      )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('asks for a rating from the create page', () => {
    render(<FeedbackCard year={2026} />)

    expect(screen.getByText(TITLE)).toBeInTheDocument()
    expect(shownEvents()).toEqual([
      ['feedback_prompt_shown', { source: 'create_card', year: 2026 }],
    ])
  })

  it('stays hidden after recent feedback', () => {
    markFeedbackSubmitted()
    render(<FeedbackCard year={2026} />)

    expect(screen.queryByText(TITLE)).not.toBeInTheDocument()
    expect(shownEvents()).toEqual([])
  })

  it('stays hidden after it was dismissed', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<FeedbackCard year={2026} />)

    await user.click(
      screen.getByRole('button', { name: 'Dismiss feedback prompt' })
    )
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument()

    unmount()
    render(<FeedbackCard year={2026} />)
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument()
  })

  it('disappears once feedback is given somewhere else', () => {
    render(<FeedbackCard year={2026} />)

    act(() => markFeedbackSubmitted())

    expect(screen.queryByText(TITLE)).not.toBeInTheDocument()
  })

  it('stays open for the follow-up after rating in the card', async () => {
    const user = userEvent.setup()
    render(<FeedbackCard year={2026} />)

    await user.click(screen.getByRole('radio', { name: /^5 stars/ }))

    expect(
      await screen.findByRole('group', {
        name: 'Glad you like it! What stood out?',
      })
    ).toBeInTheDocument()
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      rating: 5,
      source: 'create_card',
      context: { year: 2026 },
    })
  })

  it('counts an impression only once the card scrolls into view', () => {
    let notify: (
      entries: Partial<IntersectionObserverEntry>[]
    ) => void = () => {}
    const disconnect = vi.fn()
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: typeof notify) {
          notify = callback
        }
        observe() {}
        disconnect = disconnect
      }
    )

    render(<FeedbackCard year={2026} />)
    expect(shownEvents()).toEqual([])

    act(() => notify([{ isIntersecting: false }]))
    expect(shownEvents()).toEqual([])

    act(() => notify([{ isIntersecting: true }]))
    expect(shownEvents()).toHaveLength(1)
    expect(disconnect).toHaveBeenCalled()
  })
})
