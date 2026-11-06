import { render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import VideoOfferPanel from './VideoOfferPanel'

const fetchMock = vi.fn()

function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

describe('VideoOfferPanel', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the waitlist size and the funnel for each price', async () => {
    respond({
      total: 12,
      lastSevenDays: 3,
      funnel: [
        { price: 1.99, previews: 40, buyClicks: 10, signups: 6 },
        { price: 2.99, previews: 38, buyClicks: 7, signups: 6 },
      ],
    })
    render(<VideoOfferPanel refreshKey={0} />)

    expect(await screen.findByText('12')).toBeInTheDocument()
    expect(screen.getByText('3 in the last 7 days')).toBeInTheDocument()
    const cells = (row: HTMLElement) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent)
    const [, cheap, dear] = screen.getAllByRole('row')
    expect(cells(cheap)).toEqual(['$1.99', '40', '10', '6', '25%'])
    expect(cells(dear)).toEqual(['$2.99', '38', '7', '6', '18%'])
  })

  it('explains when nobody has seen the offer yet', async () => {
    respond({ total: 0, lastSevenDays: 0, funnel: [] })
    render(<VideoOfferPanel refreshKey={0} />)

    expect(
      await screen.findByText('No one has opened the video preview yet.')
    ).toBeInTheDocument()
  })

  it('shows an error when the stats fail to load', async () => {
    respond({ error: 'Unauthorized' }, 401)
    render(<VideoOfferPanel refreshKey={0} />)

    expect(
      await screen.findByText("Couldn't load the waitlist stats.")
    ).toBeInTheDocument()
  })

  it('shows that it is reloading while the dashboard refreshes', async () => {
    respond({
      total: 1,
      lastSevenDays: 1,
      funnel: [{ price: 1.99, previews: 4, buyClicks: 1, signups: 1 }],
    })
    const { rerender } = render(<VideoOfferPanel refreshKey={0} />)
    const panel = screen.getByRole('region', { name: 'Animated video test' })
    await screen.findByText('1 in the last 7 days')
    expect(panel).toHaveAttribute('aria-busy', 'false')

    let finish: (response: Response) => void = () => {}
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        finish = resolve
      })
    )
    rerender(<VideoOfferPanel refreshKey={1} />)

    expect(panel).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('1 in the last 7 days')).not.toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()

    finish(
      new Response(
        JSON.stringify({
          total: 2,
          lastSevenDays: 2,
          funnel: [{ price: 1.99, previews: 5, buyClicks: 2, signups: 2 }],
        })
      )
    )

    expect(await screen.findByText('2 in the last 7 days')).toBeInTheDocument()
    expect(panel).toHaveAttribute('aria-busy', 'false')
  })

  it('reloads when the dashboard is refreshed', async () => {
    respond({ total: 1, lastSevenDays: 1, funnel: [] })
    const { rerender } = render(<VideoOfferPanel refreshKey={0} />)
    await screen.findByText('1')

    respond({ total: 2, lastSevenDays: 2, funnel: [] })
    rerender(<VideoOfferPanel refreshKey={1} />)

    expect(await screen.findByText('2')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
