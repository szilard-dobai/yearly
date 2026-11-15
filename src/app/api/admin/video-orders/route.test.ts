// @vitest-environment node
import type { Database } from '@/lib/db'
import { user, videoOrders, videoRenders } from '@/lib/db/schema'
import { createTestDb } from '@/test/db'
import { NextResponse } from 'next/server'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { GET } from './route'

const { testDb, requireAdmin, isVideoSalesEnabled } = vi.hoisted(() => ({
  testDb: { current: null as unknown as Database },
  requireAdmin: vi.fn(),
  isVideoSalesEnabled: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  get db() {
    return testDb.current
  },
}))
vi.mock('@/lib/auth/server', () => ({ auth: {} }))
vi.mock('@/lib/tracking/api', () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}))
vi.mock('@/lib/videos/enabled', () => ({
  isVideoSalesEnabled: () => isVideoSalesEnabled(),
}))

function get(query = '') {
  return GET(new Request(`http://localhost/api/admin/video-orders${query}`))
}

describe('GET /api/admin/video-orders', () => {
  let close: () => Promise<void>

  beforeAll(async () => {
    const created = await createTestDb()
    testDb.current = created.db
    close = created.close

    await created.db.insert(user).values({
      id: 'ana',
      name: '',
      email: 'ana@example.com',
      emailVerified: true,
      updatedAt: new Date(),
    })
    await created.db.insert(videoOrders).values({
      id: 'order-1',
      userId: 'ana',
      pack: 'year',
      year: 2026,
      source: 'polar',
      status: 'paid',
      polarOrderId: 'polar-1',
      amountCents: 299,
      currency: 'usd',
    })
    await created.db.insert(videoRenders).values({
      id: 'render-1',
      orderId: 'order-1',
      version: 0,
      data: { days: { '2026-07-14': ['FR'] }, weekStartsOn: 1 },
      status: 'ready',
      workflowRunId: 'run-1',
      files: [
        {
          kind: 'year',
          theme: 'dark',
          pathname: 'production/renders/render-1/year-dark.mp4',
          bytes: 1,
        },
      ],
    })
  })

  afterAll(async () => {
    await close()
  })

  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue(null)
    isVideoSalesEnabled.mockReset().mockReturnValue(true)
  })

  it("is hidden while video sales aren't on", async () => {
    isVideoSalesEnabled.mockReturnValue(false)

    const response = await get()

    expect(response.status).toBe(404)
    expect(requireAdmin).not.toHaveBeenCalled()
  })

  it('requires an admin session', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    expect((await get()).status).toBe(401)
  })

  it('returns the totals and the first page of orders', async () => {
    const response = await get()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(body.totals).toMatchObject({ paidOrders: 1 })
    expect(body.hasMore).toBe(false)
    expect(body.orders).toEqual([
      expect.objectContaining({
        id: 'order-1',
        email: 'ana@example.com',
        render: expect.objectContaining({ version: 0, status: 'ready' }),
      }),
    ])
  })

  it('leaves the totals out of later pages', async () => {
    const body = await (await get('?offset=50')).json()

    expect(body).toEqual({ orders: [], hasMore: false, totals: null })
  })

  it('never sends trips or file links', async () => {
    const text = await (await get()).text()

    expect(text).not.toContain('2026-07-14')
    expect(text).not.toContain('"FR"')
    expect(text).not.toContain('.mp4')
    expect(text).not.toContain('render-1')
  })
})
