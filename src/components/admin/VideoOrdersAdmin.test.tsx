import type { AdminVideoOrder, AdminVideoTotals } from '@/lib/videos/admin'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import VideoOrdersAdmin from './VideoOrdersAdmin'

vi.mock('@/lib/hooks/useAdminAuth', () => ({
  useAdminAuth: () => ({
    status: 'authenticated',
    login: vi.fn(),
    logout: vi.fn(),
    markUnauthenticated: vi.fn(),
  }),
}))
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/videos' }))

const fetchMock = vi.fn()

const TOTALS: AdminVideoTotals = {
  paidOrders: 2,
  freeOrders: 1,
  refundedOrders: 0,
  revenue: [{ currency: 'usd', amountCents: 598 }],
  failedRenders: 1,
  activeRenders: 0,
  creditsLeft: 41,
}

function order(overrides: Partial<AdminVideoOrder>): AdminVideoOrder {
  return {
    id: 'order-1',
    createdAt: '2026-12-02T10:00:00.000Z',
    email: 'ana@example.com',
    pack: 'year',
    year: 2026,
    month: null,
    source: 'polar',
    status: 'paid',
    amountCents: 299,
    currency: 'usd',
    polarOrderUrl: 'https://polar.sh/dashboard/yearly/sales/polar-1',
    updatesUsed: 1,
    render: {
      version: 1,
      status: 'ready',
      error: null,
      finishedAt: '2026-12-02T10:01:00.000Z',
    },
    ...overrides,
  }
}

const ORDERS = [
  order({}),
  order({
    id: 'order-2',
    email: 'bo@example.com',
    pack: 'month',
    month: 11,
    updatesUsed: 0,
    render: {
      version: 0,
      status: 'failed',
      error: 'Sandbox rate limit',
      finishedAt: '2026-12-02T09:05:00.000Z',
    },
  }),
  order({
    id: 'order-3',
    email: 'cy@example.com',
    source: 'credit',
    amountCents: null,
    currency: null,
    polarOrderUrl: null,
    updatesUsed: 0,
    render: null,
  }),
]

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

describe('VideoOrdersAdmin', () => {
  beforeEach(() => {
    fetchMock
      .mockReset()
      .mockImplementation((url: string, init?: RequestInit) =>
        init?.method === 'POST'
          ? json({ status: 'queued' }, 202)
          : json({ orders: ORDERS, hasMore: false, totals: TOTALS })
      )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the totals and each order', async () => {
    render(<VideoOrdersAdmin />)

    expect(await screen.findByText('$5.98')).toBeInTheDocument()
    expect(screen.getByText('41')).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getByText('bo@example.com')).toBeInTheDocument()
    expect(within(table).getByText('December 2026')).toBeInTheDocument()
    expect(within(table).getByText('Sandbox rate limit')).toBeInTheDocument()
    expect(within(table).getAllByText('Year 2026')).toHaveLength(2)
    expect(within(table).getByText('Free credit')).toBeInTheDocument()
    expect(
      within(table)
        .getAllByRole('link', { name: 'Polar order' })
        .map((link) => link.getAttribute('href'))
    ).toEqual([
      'https://polar.sh/dashboard/yearly/sales/polar-1',
      'https://polar.sh/dashboard/yearly/sales/polar-1',
    ])
  })

  it('offers a render again only for the failed render', async () => {
    render(<VideoOrdersAdmin />)
    const table = await screen.findByRole('table')

    const rows = within(table).getAllByRole('row').slice(1)
    expect(
      rows.map(
        (row) =>
          within(row).queryAllByRole('button', { name: 'Render again' }).length
      )
    ).toEqual([0, 1, 0])
  })

  it('asks before rendering again, then reloads the orders', async () => {
    const user = userEvent.setup()
    render(<VideoOrdersAdmin />)
    const table = await screen.findByRole('table')

    await user.click(
      within(table).getByRole('button', { name: 'Render again' })
    )
    const dialog = await screen.findByRole('alertdialog')
    expect(
      within(dialog).getByText('Render version 0 again?')
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await user.click(
      within(dialog).getByRole('button', { name: 'Render again' })
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/admin/video-orders/order-2/render-again',
      { method: 'POST' }
    )
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/admin/video-orders?offset=0'
    )
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    )
  })

  it('keeps the dialog open with the reason when the render is refused', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? json({ error: "The order's latest render hasn't failed" }, 409)
        : json({ orders: ORDERS, hasMore: false, totals: TOTALS })
    )
    const user = userEvent.setup()
    render(<VideoOrdersAdmin />)
    const table = await screen.findByRole('table')

    await user.click(
      within(table).getByRole('button', { name: 'Render again' })
    )
    const dialog = await screen.findByRole('alertdialog')
    await user.click(
      within(dialog).getByRole('button', { name: 'Render again' })
    )

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      "The order's latest render hasn't failed"
    )
  })

  it('says when there are no orders yet', async () => {
    fetchMock.mockImplementation(() =>
      json({ orders: [], hasMore: false, totals: TOTALS })
    )
    render(<VideoOrdersAdmin />)

    expect(await screen.findByText('No video orders yet.')).toBeInTheDocument()
  })
})
