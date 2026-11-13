import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FirstSyncDialog from './FirstSyncDialog'

function request(newDays: number, accountDays: number, crowdedDays = 0) {
  return { summary: { newDays, accountDays, crowdedDays }, resolve: vi.fn() }
}

describe('FirstSyncDialog', () => {
  it('stays hidden until there is a question', () => {
    render(<FirstSyncDialog request={null} />)

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('says how many days each side has', () => {
    render(<FirstSyncDialog request={request(12, 40)} />)

    expect(
      screen.getByText("This device has trips that aren't in your account")
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "12 days here aren't in your account yet. Your account has 40 days of trips."
      )
    ).toBeInTheDocument()
  })

  it('uses the singular for one day', () => {
    render(<FirstSyncDialog request={request(1, 1)} />)

    expect(
      screen.getByText(
        "1 day here isn't in your account yet. Your account has 1 day of trips."
      )
    ).toBeInTheDocument()
  })

  it('warns when some days would have too many countries', () => {
    render(<FirstSyncDialog request={request(3, 5, 2)} />)

    expect(
      screen.getByText(/On 2 days, the two calendars have more than two/)
    ).toBeInTheDocument()
  })

  it('adds the trips to the account', async () => {
    const req = request(12, 40)
    render(<FirstSyncDialog request={req} />)

    await userEvent.click(
      screen.getByRole('button', { name: 'Add them to my account' })
    )

    expect(req.resolve).toHaveBeenCalledWith('merge')
  })

  it('uses the account only', async () => {
    const req = request(12, 40)
    render(<FirstSyncDialog request={req} />)

    await userEvent.click(
      screen.getByRole('button', { name: 'Use my account only' })
    )

    expect(req.resolve).toHaveBeenCalledWith('account')
  })

  it('can’t be dismissed without choosing', async () => {
    const req = request(12, 40)
    render(<FirstSyncDialog request={req} />)

    await userEvent.keyboard('{Escape}')

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(req.resolve).not.toHaveBeenCalled()
  })
})
