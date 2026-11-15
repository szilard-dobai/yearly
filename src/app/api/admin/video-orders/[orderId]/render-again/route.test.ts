// @vitest-environment node
import type { Database } from '@/lib/db'
import {
  user,
  videoOrders,
  videoRenders,
  type VideoRenderStatus,
} from '@/lib/db/schema'
import { createTestDb } from '@/test/db'
import { eq } from 'drizzle-orm'
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
import { POST } from './route'

const { testDb, requireAdmin, isVideoSalesEnabled, startRender } = vi.hoisted(
  () => ({
    testDb: { current: null as unknown as Database },
    requireAdmin: vi.fn(),
    isVideoSalesEnabled: vi.fn(),
    startRender: vi.fn(),
  })
)

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
vi.mock('@/lib/videos/render', () => ({
  startRender: (...args: unknown[]) => startRender(...args),
}))

function post(orderId: string) {
  return POST(
    new Request(
      `http://localhost/api/admin/video-orders/${orderId}/render-again`,
      { method: 'POST' }
    ),
    { params: Promise.resolve({ orderId }) }
  )
}

async function renderOf(orderId: string) {
  const [row] = await testDb.current
    .select()
    .from(videoRenders)
    .where(eq(videoRenders.orderId, orderId))
  return row
}

describe('POST /api/admin/video-orders/[orderId]/render-again', () => {
  let close: () => Promise<void>

  beforeAll(async () => {
    ;({ db: testDb.current, close } = await createTestDb())
    await testDb.current.insert(user).values({
      id: 'ana',
      name: '',
      email: 'ana@example.com',
      emailVerified: true,
      updatedAt: new Date(),
    })
  })

  afterAll(async () => {
    await close()
  })

  async function seed(
    id: string,
    status: VideoRenderStatus,
    orderStatus: 'paid' | 'draft' = 'paid'
  ) {
    await testDb.current.insert(videoOrders).values({
      id,
      userId: 'ana',
      pack: 'month',
      year: 2026,
      month: 6,
      source: 'polar',
      status: orderStatus,
    })
    await testDb.current.insert(videoRenders).values({
      id: `${id}-v0`,
      orderId: id,
      version: 0,
      data: { days: { '2026-07-14': ['FR'] }, weekStartsOn: 1 },
      status,
      workflowRunId: status === 'queued' ? null : 'run-old',
      error: status === 'failed' ? 'Sandbox rate limit' : null,
    })
  }

  beforeEach(async () => {
    requireAdmin.mockReset().mockResolvedValue(null)
    isVideoSalesEnabled.mockReset().mockReturnValue(true)
    startRender.mockReset().mockResolvedValue(undefined)
    await testDb.current.delete(videoOrders)
  })

  it("is hidden while video sales aren't on", async () => {
    isVideoSalesEnabled.mockReturnValue(false)
    await seed('order-1', 'failed')

    expect((await post('order-1')).status).toBe(404)
    expect(requireAdmin).not.toHaveBeenCalled()
    expect((await renderOf('order-1')).status).toBe('failed')
  })

  it('requires an admin session', async () => {
    requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
    await seed('order-1', 'failed')

    expect((await post('order-1')).status).toBe(401)
    expect(startRender).not.toHaveBeenCalled()
    expect((await renderOf('order-1')).status).toBe('failed')
  })

  it('starts a failed render again', async () => {
    await seed('order-1', 'failed')

    const response = await post('order-1')

    expect(response.status).toBe(202)
    expect(await response.json()).toEqual({ status: 'queued' })
    expect(startRender).toHaveBeenCalledWith(
      testDb.current,
      'order-1-v0',
      'month'
    )
    expect(await renderOf('order-1')).toMatchObject({
      status: 'queued',
      workflowRunId: null,
      error: null,
    })
  })

  it.each(['ready', 'rendering', 'queued'] as const)(
    'refuses a %s render',
    async (status) => {
      await seed('order-1', status)

      const response = await post('order-1')

      expect(response.status).toBe(409)
      expect(startRender).not.toHaveBeenCalled()
      expect((await renderOf('order-1')).status).toBe(status)
    }
  )

  it("refuses an order that isn't paid", async () => {
    await seed('order-1', 'failed', 'draft')

    expect((await post('order-1')).status).toBe(409)
    expect(startRender).not.toHaveBeenCalled()
  })

  it("answers 404 for an order that doesn't exist", async () => {
    expect((await post('missing')).status).toBe(404)
  })

  it('marks the render failed again when it can’t start', async () => {
    await seed('order-1', 'failed')
    startRender.mockRejectedValue(new Error('Workflow is down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await post('order-1')

    expect(response.status).toBe(502)
    expect(await renderOf('order-1')).toMatchObject({
      status: 'failed',
      error: 'Could not start the render again: Error: Workflow is down',
    })
  })

  it('never sends trips back', async () => {
    await seed('order-1', 'failed')

    const text = await (await post('order-1')).text()

    expect(text).not.toContain('2026-07-14')
    expect(text).not.toContain('FR')
  })
})
