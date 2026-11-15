// @vitest-environment node
import type { Database } from '@/lib/db'
import { user, videoCredits, videoOrders, videoRenders } from '@/lib/db/schema'
import { createTestDb } from '@/test/db'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  claimRenderStart,
  createOrder,
  createUpdate,
  hasFreeVideo,
  listOrdersForUser,
  listUserVideoFiles,
  markOrderPaid,
  markOrderRefunded,
  markRenderReady,
  resetRenderForRetry,
  markRenderFailed,
} from './orders'

const YEAR = { pack: 'year', year: 2026 } as const
const DAYS = {
  '2025-12-31': ['FR'],
  '2026-03-01': ['FR'],
  '2026-03-02': ['FR'],
  '2026-03-03': ['FR'],
  '2026-03-04': ['FR'],
  '2026-03-05': ['DE'],
}
const DATA = { days: DAYS, weekStartsOn: 1 }

function file(name: string) {
  return {
    kind: 'year' as const,
    theme: 'dark' as const,
    pathname: name,
    bytes: 1,
  }
}

describe('video orders', () => {
  let db: Database
  let close: () => Promise<void>

  beforeAll(async () => {
    ;({ db, close } = await createTestDb())
  })

  afterAll(async () => {
    await close()
  })

  beforeEach(async () => {
    await db.delete(videoCredits)
    await db.delete(videoOrders)
    await db.delete(user)
    await db.insert(user).values({
      id: 'ana',
      name: '',
      email: 'ana@example.com',
      emailVerified: true,
      updatedAt: new Date(),
    })
  })

  async function addCredit(
    email = 'ana@example.com',
    expiresAt = new Date(Date.now() + 86_400_000)
  ) {
    await db
      .insert(videoCredits)
      .values({ email, source: 'waitlist', expiresAt })
  }

  async function paidOrder() {
    const { order, render } = await createOrder(db, {
      userId: 'ana',
      email: 'ana@example.com',
      emailVerified: true,
      period: YEAR,
      data: DATA,
    })
    await markOrderPaid(db, {
      orderId: order.id,
      polarOrderId: `polar-${order.id}`,
      amountCents: 299,
      currency: 'usd',
    })
    return { order, render }
  }

  describe('createOrder', () => {
    it('makes a draft with the trips in the period when there is no free video', async () => {
      const { order, render, free } = await createOrder(db, {
        userId: 'ana',
        email: 'ana@example.com',
        emailVerified: true,
        period: YEAR,
        data: DATA,
      })

      expect(free).toBe(false)
      expect(order).toMatchObject({
        status: 'draft',
        source: 'polar',
        pack: 'year',
        year: 2026,
      })
      expect(render).toMatchObject({ version: 0, status: 'queued' })
      expect(Object.keys(render.data.days)).not.toContain('2025-12-31')
      expect(Object.keys(render.data.days)).toHaveLength(5)
    })

    it('uses the free video for a checked email once, and forgets the email', async () => {
      await addCredit()

      const first = await createOrder(db, {
        userId: 'ana',
        email: 'Ana@Example.com',
        emailVerified: true,
        period: YEAR,
        data: DATA,
      })
      const second = await createOrder(db, {
        userId: 'ana',
        email: 'ana@example.com',
        emailVerified: true,
        period: YEAR,
        data: DATA,
      })

      expect(first.free).toBe(true)
      expect(first.order).toMatchObject({ status: 'paid', source: 'credit' })
      expect(second.free).toBe(false)
      expect(await db.select().from(videoCredits)).toEqual([])
      expect(await hasFreeVideo(db, 'ana@example.com')).toBe(false)
    })

    it("doesn't give the free video to an unchecked email or after it expires", async () => {
      await addCredit('ana@example.com', new Date(Date.now() - 1000))
      expect(await hasFreeVideo(db, 'ana@example.com')).toBe(false)

      await db.delete(videoCredits)
      await addCredit()
      const { free } = await createOrder(db, {
        userId: 'ana',
        email: 'ana@example.com',
        emailVerified: false,
        period: YEAR,
        data: DATA,
      })
      expect(free).toBe(false)
    })
  })

  describe('markOrderPaid', () => {
    it('marks the draft paid and hands back the first render, safely twice', async () => {
      const { order, render } = await createOrder(db, {
        userId: 'ana',
        email: 'ana@example.com',
        emailVerified: true,
        period: YEAR,
        data: DATA,
      })
      const payment = {
        orderId: order.id,
        polarOrderId: 'polar-1',
        amountCents: 299,
        currency: 'usd',
      }

      expect((await markOrderPaid(db, payment))?.render.id).toBe(render.id)
      expect((await markOrderPaid(db, payment))?.render.id).toBe(render.id)
      const [saved] = await db.select().from(videoOrders)
      expect(saved).toMatchObject({
        status: 'paid',
        polarOrderId: 'polar-1',
        amountCents: 299,
      })
    })

    it('ignores an unknown order', async () => {
      expect(
        await markOrderPaid(db, {
          orderId: 'missing',
          polarOrderId: 'polar-2',
          amountCents: 299,
          currency: 'usd',
        })
      ).toBeNull()
    })
  })

  it('lets only one caller start a render', async () => {
    const { render } = await paidOrder()

    expect(await claimRenderStart(db, render.id)).toBe(true)
    expect(await claimRenderStart(db, render.id)).toBe(false)
  })

  describe('markRenderReady', () => {
    it("returns the previous version's files and forgets them", async () => {
      const { order, render } = await paidOrder()
      await markRenderReady(db, render.id, [file('v0.mp4')])
      const update = await createUpdate(db, {
        userId: 'ana',
        orderId: order.id,
        data: DATA,
      })
      if (!update.ok) throw new Error(update.reason)

      const replaced = await markRenderReady(db, update.render.id, [
        file('v1.mp4'),
      ])

      expect(replaced.map((f) => f.pathname)).toEqual(['v0.mp4'])
      expect(await listUserVideoFiles(db, 'ana')).toEqual([file('v1.mp4')])
    })
  })

  describe('createUpdate', () => {
    it('adds the next version when enough days are kept', async () => {
      const { order, render } = await paidOrder()
      await markRenderReady(db, render.id, [])

      const result = await createUpdate(db, {
        userId: 'ana',
        orderId: order.id,
        data: { days: { ...DAYS, '2026-12-24': ['AT'] }, weekStartsOn: 0 },
      })

      expect(result).toMatchObject({
        ok: true,
        render: { version: 1, status: 'queued' },
      })
    })

    it('refuses trips that keep fewer than 80% of the first days', async () => {
      const { order, render } = await paidOrder()
      await markRenderReady(db, render.id, [])

      const result = await createUpdate(db, {
        userId: 'ana',
        orderId: order.id,
        data: {
          days: {
            '2026-03-01': ['FR'],
            '2026-03-02': ['FR'],
            '2026-03-03': ['FR'],
          },
          weekStartsOn: 1,
        },
      })

      expect(result).toEqual({ ok: false, reason: 'too-different' })
    })

    it('allows 3 updates', async () => {
      const { order, render } = await paidOrder()
      await markRenderReady(db, render.id, [])

      for (let i = 0; i < 3; i++) {
        const result = await createUpdate(db, {
          userId: 'ana',
          orderId: order.id,
          data: DATA,
        })
        if (!result.ok) throw new Error(result.reason)
        await markRenderReady(db, result.render.id, [])
      }

      expect(
        await createUpdate(db, { userId: 'ana', orderId: order.id, data: DATA })
      ).toEqual({
        ok: false,
        reason: 'no-updates-left',
      })
    })

    it('waits while a render is going', async () => {
      const { order } = await paidOrder()

      expect(
        await createUpdate(db, { userId: 'ana', orderId: order.id, data: DATA })
      ).toEqual({
        ok: false,
        reason: 'busy',
      })
    })

    it("refuses someone else's or an unpaid order", async () => {
      const { order } = await createOrder(db, {
        userId: 'ana',
        email: 'ana@example.com',
        emailVerified: true,
        period: YEAR,
        data: DATA,
      })

      expect(
        await createUpdate(db, { userId: 'bo', orderId: order.id, data: DATA })
      ).toEqual({
        ok: false,
        reason: 'not-found',
      })
      expect(
        await createUpdate(db, { userId: 'ana', orderId: order.id, data: DATA })
      ).toEqual({
        ok: false,
        reason: 'not-paid',
      })
    })
  })

  it('lets a failed render be queued again', async () => {
    const { render } = await paidOrder()
    await claimRenderStart(db, render.id)
    await markRenderFailed(db, render.id, 'Sandbox down')

    expect(await resetRenderForRetry(db, render.id)).toBe(true)
    expect(await claimRenderStart(db, render.id)).toBe(true)
  })

  it('removes the renders and hands back their files on a refund', async () => {
    const { order, render } = await paidOrder()
    await markRenderReady(db, render.id, [file('v0.mp4')])

    const files = await markOrderRefunded(db, `polar-${order.id}`)

    expect(files.map((f) => f.pathname)).toEqual(['v0.mp4'])
    expect(await db.select().from(videoRenders)).toEqual([])
    expect(await listOrdersForUser(db, 'ana')).toEqual([])
  })
})
