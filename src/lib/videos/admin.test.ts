// @vitest-environment node
import type { Database } from '@/lib/db'
import {
  user,
  videoCredits,
  videoOrders,
  videoRenders,
  type VideoRenderStatus,
} from '@/lib/db/schema'
import { createTestDb } from '@/test/db'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  getAdminVideoTotals,
  listAdminVideoOrders,
  queueFailedRenderAgain,
} from './admin'

const DATA = {
  days: { '2026-03-01': ['FR'], '2026-03-02': ['JP'] },
  weekStartsOn: 1,
}
const DAY = 86_400_000

type Order = typeof videoOrders.$inferInsert

describe('video orders admin', () => {
  let db: Database
  let close: () => Promise<void>

  beforeAll(async () => {
    ;({ db, close } = await createTestDb())
  })

  afterAll(async () => {
    await close()
  })

  async function order(
    id: string,
    minutesAgo: number,
    values: Partial<Order> = {}
  ) {
    await db.insert(videoOrders).values({
      id,
      userId: 'ana',
      pack: 'year',
      year: 2026,
      source: 'polar',
      status: 'paid',
      createdAt: new Date(Date.now() - minutesAgo * 60_000),
      ...values,
    })
  }

  async function render(
    orderId: string,
    version: number,
    status: VideoRenderStatus,
    error: string | null = null
  ) {
    await db.insert(videoRenders).values({
      id: `${orderId}-v${version}`,
      orderId,
      version,
      data: DATA,
      status,
      error,
      workflowRunId: status === 'queued' ? null : `run-${orderId}`,
      finishedAt:
        status === 'ready' || status === 'failed'
          ? new Date('2026-12-02T10:00:00Z')
          : null,
      files:
        status === 'ready'
          ? [
              {
                kind: 'year',
                theme: 'dark',
                pathname: `preview/renders/${orderId}/year-dark.mp4`,
                bytes: 1,
              },
            ]
          : null,
    })
  }

  beforeEach(async () => {
    await db.delete(videoCredits)
    await db.delete(videoOrders)
    await db.delete(user)
    await db.insert(user).values([
      {
        id: 'ana',
        name: '',
        email: 'ana@example.com',
        emailVerified: true,
        updatedAt: new Date(),
      },
      {
        id: 'bo',
        name: 'Bo',
        email: 'bo@example.com',
        emailVerified: true,
        updatedAt: new Date(),
      },
    ])

    await order('ready', 70, {
      polarOrderId: 'polar-ready',
      amountCents: 299,
      currency: 'usd',
    })
    await render('ready', 0, 'ready')

    await order('failed', 60, {
      userId: 'bo',
      pack: 'month',
      month: 2,
      polarOrderId: 'polar-failed',
      amountCents: 299,
      currency: 'usd',
    })
    await render('failed', 0, 'failed', 'Sandbox rate limit')

    await order('updated', 50, { source: 'credit' })
    await render('updated', 0, 'ready')
    await render('updated', 1, 'failed', 'Old failure')
    await render('updated', 2, 'ready')

    await order('refunded', 40, {
      status: 'refunded',
      polarOrderId: 'polar-refunded',
      amountCents: 299,
      currency: 'usd',
    })

    await order('draft', 30, { status: 'draft' })
    await render('draft', 0, 'queued')

    await order('euro', 20, {
      polarOrderId: 'polar-euro',
      amountCents: 279,
      currency: 'eur',
    })
    await render('euro', 0, 'rendering')

    await order('free-queued', 10, { source: 'credit' })
    await render('free-queued', 0, 'queued')

    await db.insert(videoCredits).values([
      {
        email: 'left@example.com',
        source: 'waitlist',
        expiresAt: new Date(Date.now() + DAY),
      },
      {
        email: 'gone@example.com',
        source: 'waitlist',
        expiresAt: new Date(Date.now() - DAY),
      },
    ])
  })

  it('counts orders, revenue, renders and credits', async () => {
    expect(await getAdminVideoTotals(db)).toEqual({
      paidOrders: 3,
      freeOrders: 2,
      refundedOrders: 1,
      revenue: [
        { currency: 'eur', amountCents: 279 },
        { currency: 'usd', amountCents: 598 },
      ],
      failedRenders: 1,
      activeRenders: 2,
      creditsLeft: 1,
    })
  })

  it('counts nothing on an empty store', async () => {
    await db.delete(videoCredits)
    await db.delete(videoOrders)

    expect(await getAdminVideoTotals(db)).toEqual({
      paidOrders: 0,
      freeOrders: 0,
      refundedOrders: 0,
      revenue: [],
      failedRenders: 0,
      activeRenders: 0,
      creditsLeft: 0,
    })
  })

  it('lists orders newest first with the buyer and the latest render', async () => {
    const { orders, hasMore } = await listAdminVideoOrders(db)

    expect(hasMore).toBe(false)
    expect(orders.map((o) => o.id)).toEqual([
      'free-queued',
      'euro',
      'draft',
      'refunded',
      'updated',
      'failed',
      'ready',
    ])

    const failed = orders.find((o) => o.id === 'failed')
    expect(failed).toMatchObject({
      email: 'bo@example.com',
      pack: 'month',
      year: 2026,
      month: 2,
      source: 'polar',
      status: 'paid',
      amountCents: 299,
      currency: 'usd',
      polarOrderUrl:
        'https://sandbox.polar.sh/dashboard/yearly/sales/polar-failed',
      updatesUsed: 0,
      render: {
        version: 0,
        status: 'failed',
        error: 'Sandbox rate limit',
        finishedAt: '2026-12-02T10:00:00.000Z',
      },
    })

    const updated = orders.find((o) => o.id === 'updated')
    expect(updated).toMatchObject({
      source: 'credit',
      polarOrderUrl: null,
      updatesUsed: 2,
      render: { version: 2, status: 'ready', error: null },
    })
    expect(orders.find((o) => o.id === 'refunded')?.render).toBeNull()
  })

  it('pages through the orders', async () => {
    const first = await listAdminVideoOrders(db, { limit: 4 })
    const second = await listAdminVideoOrders(db, { limit: 4, offset: 4 })

    expect(first.hasMore).toBe(true)
    expect(first.orders).toHaveLength(4)
    expect(second.hasMore).toBe(false)
    expect(second.orders.map((o) => o.id)).toEqual([
      'updated',
      'failed',
      'ready',
    ])
  })

  it('never returns trips or video files', async () => {
    const listed = JSON.stringify(await listAdminVideoOrders(db))

    expect(listed).not.toContain('2026-03-01')
    expect(listed).not.toContain('FR')
    expect(listed).not.toContain('.mp4')
    expect(listed).not.toContain('weekStartsOn')
  })

  it('queues a failed latest render again', async () => {
    expect(await queueFailedRenderAgain(db, 'failed')).toEqual({
      ok: true,
      renderId: 'failed-v0',
      pack: 'month',
    })

    const [row] = await db
      .select()
      .from(videoRenders)
      .where(eq(videoRenders.id, 'failed-v0'))
    expect(row).toMatchObject({
      status: 'queued',
      workflowRunId: null,
      error: null,
    })
    const { orders } = await listAdminVideoOrders(db)
    expect(orders.find((o) => o.id === 'failed')?.render).toEqual({
      version: 0,
      status: 'queued',
      error: null,
      finishedAt: null,
    })
  })

  it("refuses an order whose latest render didn't fail", async () => {
    for (const id of ['ready', 'updated', 'refunded', 'draft', 'euro']) {
      expect(await queueFailedRenderAgain(db, id)).toEqual({
        ok: false,
        reason: 'not-failed',
      })
    }
    expect(await queueFailedRenderAgain(db, 'missing')).toEqual({
      ok: false,
      reason: 'not-found',
    })

    const [old] = await db
      .select({ status: videoRenders.status })
      .from(videoRenders)
      .where(eq(videoRenders.id, 'updated-v1'))
    expect(old.status).toBe('failed')
  })
})
