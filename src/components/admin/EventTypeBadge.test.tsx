import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EventTypeBadge from './EventTypeBadge'

describe('EventTypeBadge', () => {
  it('shows the readable label and keeps the raw type as a tooltip', () => {
    render(<EventTypeBadge type="feedback_submitted" />)

    const badge = screen.getByText('Feedback submitted')
    expect(badge).toHaveAttribute('title', 'feedback_submitted')
    expect(badge.className).toContain('bg-amber-100')
  })

  it('appends a count when given one', () => {
    render(<EventTypeBadge type="visit_add_attempt" count={1200} />)

    expect(
      screen.getByText(`Visit add attempted × ${(1200).toLocaleString()}`)
    ).toBeInTheDocument()
  })
})
