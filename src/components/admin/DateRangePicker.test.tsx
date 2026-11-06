import { renderWithSettings as render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DateRangePicker, { formatDateRange } from './DateRangePicker'

function Harness({
  initial,
  onChange,
}: {
  initial?: DateRange
  onChange: (range: DateRange | undefined) => void
}) {
  const [range, setRange] = useState(initial)
  return (
    <DateRangePicker
      value={range}
      onChange={(next) => {
        setRange(next)
        onChange(next)
      }}
    />
  )
}

describe('formatDateRange', () => {
  it('describes the range in words', () => {
    expect(formatDateRange(undefined)).toBe('All time')
    expect(
      formatDateRange({
        from: new Date(2026, 10, 1),
        to: new Date(2026, 10, 30),
      })
    ).toBe('1 Nov – 30 Nov 2026')
    expect(
      formatDateRange({
        from: new Date(2025, 11, 28),
        to: new Date(2026, 0, 3),
      })
    ).toBe('28 Dec 2025 – 3 Jan 2026')
    expect(formatDateRange({ from: new Date(2026, 9, 28) })).toBe('28 Oct 2026')
    expect(
      formatDateRange({
        from: new Date(2026, 9, 28),
        to: new Date(2026, 9, 28),
      })
    ).toBe('28 Oct 2026')
  })
})

describe('DateRangePicker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 15, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('picks a range from the calendar and closes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.click(
      screen.getByRole('button', { name: 'Date range: All time' })
    )
    await user.click(screen.getByRole('button', { name: /November 2nd, 2026/ }))

    expect(
      screen.getByRole('button', { name: 'Date range: 2 Nov 2026' })
    ).toBeInTheDocument()
    expect(screen.getByText('Select date range')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /November 9th, 2026/ }))

    expect(onChange).toHaveBeenLastCalledWith({
      from: new Date(2026, 10, 2),
      to: new Date(2026, 10, 9),
    })
    expect(
      screen.getByRole('button', { name: 'Date range: 2 Nov – 9 Nov 2026' })
    ).toBeInTheDocument()
    expect(screen.queryByText('Select date range')).not.toBeInTheDocument()
  })

  it('does not offer days after today', async () => {
    const user = userEvent.setup()
    render(<Harness onChange={vi.fn()} />)

    await user.click(
      screen.getByRole('button', { name: 'Date range: All time' })
    )

    expect(
      screen.getByRole('button', { name: /November 16th, 2026/ })
    ).toBeDisabled()
  })

  it('clears back to all time', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Harness
        initial={{ from: new Date(2026, 10, 1), to: new Date(2026, 10, 7) }}
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Clear date range' }))

    expect(onChange).toHaveBeenLastCalledWith(undefined)
    expect(
      screen.getByRole('button', { name: 'Date range: All time' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Clear date range' })
    ).not.toBeInTheDocument()
  })

  it('clears from inside the calendar too', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Harness
        initial={{ from: new Date(2026, 10, 1), to: new Date(2026, 10, 7) }}
        onChange={onChange}
      />
    )

    await user.click(
      screen.getByRole('button', { name: 'Date range: 1 Nov – 7 Nov 2026' })
    )
    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(onChange).toHaveBeenLastCalledWith(undefined)
    expect(screen.queryByText('Select date range')).not.toBeInTheDocument()
  })
})
