import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UnsubscribeForm from './UnsubscribeForm'

const fetchMock = vi.fn()

function renderForm() {
  render(
    <UnsubscribeForm
      token="abc.def"
      freeUntil="31 January 2027"
      contactEmail="hello@yearly.world"
    />
  )
}

describe('UnsubscribeForm', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('only unsubscribes when the button is pressed', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(new Response('{"success":true}'))
    renderForm()

    expect(fetchMock).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Unsubscribe' }))

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/waitlist/unsubscribe?token=abc.def',
      { method: 'POST' }
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      "You're unsubscribed."
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'sign in with the same email by 31 January 2027'
    )
  })

  it('offers another way when it fails', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(new Response('{}', { status: 500 }))
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Unsubscribe' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'email hello@yearly.world'
    )
    expect(
      screen.getByRole('button', { name: 'Unsubscribe' })
    ).not.toBeDisabled()
  })
})
