import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import VideoLaunchEmailPanel from './VideoLaunchEmailPanel'

const fetchMock = vi.fn()

const blockedStatus = {
  total: 40,
  sent: 0,
  failed: 0,
  left: 40,
  needsCheck: 0,
  freeUntil: '31 January 2027',
  blocked: 'Turn on video sales first',
}

const openStatus = {
  ...blockedStatus,
  sent: 30,
  failed: 2,
  left: 10,
  needsCheck: 1,
  blocked: null,
}

function respond(body: unknown) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body)))
}

function metric(label: string) {
  return screen.getByText(label).parentElement
}

describe('VideoLaunchEmailPanel', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the waitlist, how the send is going and the offer date', async () => {
    respond(openStatus)
    render(<VideoLaunchEmailPanel refreshKey={0} />)

    expect(
      await screen.findByText(/first video free until 31 January 2027/)
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/waitlist/launch-email')
    expect(metric('On the waitlist')).toHaveTextContent('40')
    expect(metric('Sent')).toHaveTextContent('30')
    expect(metric('Failed')).toHaveTextContent('2')
    expect(metric('Left')).toHaveTextContent('10')
    expect(
      screen.getByText("1 won't be retried; check Resend's logs")
    ).toBeInTheDocument()
  })

  it('says why it cannot send yet, but still offers a test', async () => {
    respond(blockedStatus)
    render(<VideoLaunchEmailPanel refreshKey={0} />)

    expect(
      await screen.findByText('Turn on video sales first')
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Run now' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Send a test' })
    ).toBeInTheDocument()
  })

  it('sends after a confirmation and reloads the numbers', async () => {
    const user = userEvent.setup()
    respond(openStatus)
    render(<VideoLaunchEmailPanel refreshKey={0} />)
    await user.click(await screen.findByRole('button', { name: 'Run now' }))

    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'Import the free video credits first.'
    )
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            total: 40,
            alreadySent: 30,
            sentNow: 10,
            failed: 0,
            left: 0,
            needsCheck: 1,
            stopped: 'done',
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...openStatus, sent: 40, left: 0 }))
      )
    await user.click(screen.getByRole('button', { name: 'Send now' }))

    expect(
      await screen.findByText('Last run: Sent 10, 0 failed, 0 left.')
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/waitlist/launch-email',
      expect.objectContaining({ method: 'POST' })
    )
    await vi.waitFor(() => expect(metric('Sent')).toHaveTextContent('40'))
  })

  it('sends a test to the address typed in', async () => {
    const user = userEvent.setup()
    respond(blockedStatus)
    render(<VideoLaunchEmailPanel refreshKey={0} />)
    await user.click(await screen.findByRole('button', { name: 'Send a test' }))
    const dialog = screen.getByRole('dialog')

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }))
    )
    await user.type(
      within(dialog).getByLabelText('Email address'),
      'me@example.com'
    )
    await user.click(within(dialog).getByRole('button', { name: 'Send test' }))

    expect(
      await within(dialog).findByText('Sent. Check that inbox.')
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/waitlist/launch-email/test',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'me@example.com' }),
      }
    )
  })

  it('shows an error when the status fails to load', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 500 }))
    render(<VideoLaunchEmailPanel refreshKey={0} />)

    expect(
      await screen.findByText("Couldn't load the launch email status.")
    ).toBeInTheDocument()
  })
})
