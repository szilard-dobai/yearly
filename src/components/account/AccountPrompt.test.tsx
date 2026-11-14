import { render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ACCOUNT_PROMPT_SNOOZE_DAYS,
  useAccountPromptDismissed,
} from '@/lib/hooks/useAccountPrompt'
import AccountPrompt from './AccountPrompt'

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }))

vi.mock('@/lib/tracking', () => ({ trackEvent }))

describe('AccountPrompt', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('explains the risk, the offer and that an account is optional', () => {
    render(<AccountPrompt days={4} />)

    expect(
      screen.getByText('Your trips are only in this browser')
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Clearing your browser data deletes them/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/You can keep using Yearly without one\./)
    ).toBeInTheDocument()
  })

  it('closes with the × button too', async () => {
    const { result } = renderHook(() => useAccountPromptDismissed())
    render(<AccountPrompt days={4} />)

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(result.current).toBe(true)
  })

  it('sends people to sign in and back to their calendar', async () => {
    render(<AccountPrompt days={4} />)

    const link = screen.getByRole('link', { name: 'Save my calendar' })
    expect(link).toHaveAttribute('href', '/sign-in?next=/create')
    await userEvent.click(link)

    expect(trackEvent).toHaveBeenCalledWith('account_prompt_click', { days: 4 })
  })

  it('records when it has been seen and tells the page', () => {
    const onSeen = vi.fn()
    render(<AccountPrompt days={4} onSeen={onSeen} />)

    expect(trackEvent).toHaveBeenCalledWith('account_prompt_shown', {
      days: 4,
    })
    expect(onSeen).toHaveBeenCalledTimes(1)
  })

  it('snoozes when dismissed', async () => {
    const { result } = renderHook(() => useAccountPromptDismissed())
    expect(result.current).toBe(false)

    render(<AccountPrompt days={4} />)
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }))

    expect(trackEvent).toHaveBeenCalledWith('account_prompt_dismissed', {
      days: 4,
    })
    expect(result.current).toBe(true)
  })
})

describe('useAccountPromptDismissed', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('comes back after the snooze has passed', () => {
    const longAgo =
      Date.now() - (ACCOUNT_PROMPT_SNOOZE_DAYS + 1) * 24 * 60 * 60 * 1000
    localStorage.setItem('yearly_account_prompt_dismissed_at', String(longAgo))

    const { result } = renderHook(() => useAccountPromptDismissed())

    expect(result.current).toBe(false)
  })
})
