import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MobileFab from './MobileFab'

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
}))

const props = () => ({
  onAddClick: vi.fn(),
  onExportClick: vi.fn(() => Promise.resolve()),
  onExportStatsClick: vi.fn(() => Promise.resolve()),
  onExportMonthClick: vi.fn(),
  onFeedbackClick: vi.fn(),
  hasVisits: true,
})

describe('MobileFab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a scrim only while the menu is open', async () => {
    const user = userEvent.setup()
    render(<MobileFab {...props()} />)

    expect(screen.queryByTestId('mobile-fab-scrim')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getByTestId('mobile-fab-scrim')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(screen.queryByTestId('mobile-fab-scrim')).not.toBeInTheDocument()
  })

  it('closes the menu when the scrim is tapped', async () => {
    const user = userEvent.setup()
    render(<MobileFab {...props()} />)

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(screen.getByTestId('mobile-fab-scrim'))

    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    expect(
      screen.queryByRole('button', { name: 'Add visit' })
    ).not.toBeInTheDocument()
  })

  it('keeps the menu open while an export is running', async () => {
    const user = userEvent.setup()
    let finishExport = () => {}
    const fabProps = props()
    fabProps.onExportClick = vi.fn(
      () => new Promise<void>((resolve) => (finishExport = resolve))
    )
    render(<MobileFab {...fabProps} />)

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(
      screen.getByRole('button', { name: 'Download calendar image' })
    )
    await user.click(screen.getByTestId('mobile-fab-scrim'))

    expect(screen.getByText('Generating...')).toBeInTheDocument()

    finishExport()
    expect(
      await screen.findByRole('button', { name: 'Open menu' })
    ).toBeInTheDocument()
    expect(screen.queryByTestId('mobile-fab-scrim')).not.toBeInTheDocument()
  })

  it('runs an action and closes the menu', async () => {
    const user = userEvent.setup()
    const fabProps = props()
    render(<MobileFab {...fabProps} />)

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    await user.click(screen.getByRole('button', { name: 'Send feedback' }))

    expect(fabProps.onFeedbackClick).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('mobile-fab-scrim')).not.toBeInTheDocument()
  })

  it('only offers downloads when there are visits', async () => {
    const user = userEvent.setup()
    render(<MobileFab {...props()} hasVisits={false} />)

    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    expect(screen.getByRole('button', { name: 'Add visit' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Download calendar image' })
    ).not.toBeInTheDocument()
  })
})
