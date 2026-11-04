import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import StarRating from './StarRating'

describe('StarRating', () => {
  it('renders five selectable stars in a radio group', () => {
    render(<StarRating value={null} onChange={vi.fn()} label="Rate us" />)

    expect(screen.getByRole('radiogroup', { name: 'Rate us' })).toBeVisible()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
  })

  it('reports the selected value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StarRating value={null} onChange={onChange} />)

    await user.click(screen.getByRole('radio', { name: /^4 stars/ }))

    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('marks the current value as checked', () => {
    render(<StarRating value={3} onChange={vi.fn()} />)

    expect(screen.getByRole('radio', { name: /^3 stars/ })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(screen.getByRole('radio', { name: /^4 stars/ })).toHaveAttribute(
      'aria-checked',
      'false'
    )
  })

  it('shows a hint for the hovered star', async () => {
    const user = userEvent.setup()
    render(<StarRating value={null} onChange={vi.fn()} showHint />)

    await user.hover(screen.getByRole('radio', { name: /^5 stars/ }))

    expect(screen.getByText('Love it!')).toBeInTheDocument()
  })

  it('does not preview a rating when a star only receives focus', () => {
    render(<StarRating value={null} onChange={vi.fn()} showHint />)

    screen.getByRole('radio', { name: /^1 star/ }).focus()

    expect(screen.queryByText('Not great')).not.toBeInTheDocument()
  })

  it('renders a read-only rating as an image', () => {
    render(<StarRating value={2} />)

    expect(
      screen.getByRole('img', { name: '2 out of 5 stars' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })
})
