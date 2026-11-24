import { sameCalendarDays } from '@/lib/calendar-sync/days'
import type { Database } from '@/lib/db'
import {
  user,
  videoCredits,
  videoOrders,
  videoRenders,
  type VideoFile,
  type VideoRenderData,
} from '@/lib/db/schema'
import { and, desc, eq, gt, inArray, isNull, lt, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import {
  daysInPeriod,
  keepsEnoughDays,
  MAX_UPDATES,
  periodOf,
  type VideoPeriod,
} from './period'

export type VideoOrder = typeof videoOrders.$inferSelect
export type VideoRender = typeof videoRenders.$inferSelect

const ACTIVE_RENDER: ReadonlySet<string> = new Set(['queued', 'rendering'])

function unexpiredCredit(email: string) {
  return and(
    eq(videoCredits.email, email.toLowerCase()),
    gt(videoCredits.expiresAt, sql`now()`)
  )
}

export async function hasFreeVideo(db: Database, email: string) {
  const [credit] = await db
    .select({ email: videoCredits.email })
    .from(videoCredits)
    .where(unexpiredCredit(email))
  return Boolean(credit)
}

export async function createOrder(
  db: Database,
  input: {
    userId: string
    email: string
    emailVerified: boolean
    period: VideoPeriod
    data: VideoRenderData
  }
): Promise<{ order: VideoOrder; render: VideoRender; free: boolean }> {
  const { period } = input
  const data: VideoRenderData = {
    days: daysInPeriod(input.data.days, period),
    weekStartsOn: input.data.weekStartsOn,
  }

  return db.transaction(async (tx) => {
    const orderId = randomUUID()
    const claimed = input.emailVerified
      ? await tx
          .delete(videoCredits)
          .where(unexpiredCredit(input.email))
          .returning({ email: videoCredits.email })
      : []
    const free = claimed.length > 0

    const [order] = await tx
      .insert(videoOrders)
      .values({
        id: orderId,
        userId: input.userId,
        pack: period.pack,
        year: period.year,
        month: period.pack === 'month' ? period.month : null,
        source: free ? 'credit' : 'polar',
        status: free ? 'paid' : 'draft',
        paidAt: free ? new Date() : null,
      })
      .returning()

    const [render] = await tx
      .insert(videoRenders)
      .values({
        id: randomUUID(),
        orderId,
        version: 0,
        data,
        status: 'queued',
      })
      .returning()

    return { order, render, free }
  })
}

export async function setCheckout(
  db: Database,
  orderId: string,
  checkoutId: string
) {
  await db
    .update(videoOrders)
    .set({ polarCheckoutId: checkoutId })
    .where(eq(videoOrders.id, orderId))
}

export async function markOrderPaid(
  db: Database,
  input: {
    orderId: string
    polarOrderId: string
    amountCents: number
    currency: string
  }
): Promise<{ render: VideoRender; pack: VideoOrder['pack'] } | null> {
  await db
    .update(videoOrders)
    .set({
      status: 'paid',
      paidAt: sql`now()`,
      polarOrderId: input.polarOrderId,
      amountCents: input.amountCents,
      currency: input.currency,
    })
    .where(
      and(eq(videoOrders.id, input.orderId), eq(videoOrders.status, 'draft'))
    )

  const [order] = await db
    .select({ status: videoOrders.status, pack: videoOrders.pack })
    .from(videoOrders)
    .where(eq(videoOrders.id, input.orderId))
  if (order?.status !== 'paid') return null

  const [render] = await db
    .select()
    .from(videoRenders)
    .where(
      and(eq(videoRenders.orderId, input.orderId), eq(videoRenders.version, 0))
    )
  return render ? { render, pack: order.pack } : null
}

export async function markOrderRefunded(
  db: Database,
  polarOrderId: string
): Promise<VideoFile[]> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .update(videoOrders)
      .set({ status: 'refunded', refundedAt: sql`now()` })
      .where(eq(videoOrders.polarOrderId, polarOrderId))
      .returning({ id: videoOrders.id })
    if (!order) return []

    const renders = await tx
      .delete(videoRenders)
      .where(eq(videoRenders.orderId, order.id))
      .returning({ files: videoRenders.files })
    return renders.flatMap((render) => render.files ?? [])
  })
}

export async function claimRenderStart(
  db: Database,
  renderId: string
): Promise<boolean> {
  const claimed = await db
    .update(videoRenders)
    .set({ workflowRunId: 'starting' })
    .where(
      and(
        eq(videoRenders.id, renderId),
        eq(videoRenders.status, 'queued'),
        isNull(videoRenders.workflowRunId)
      )
    )
    .returning({ id: videoRenders.id })
  return claimed.length > 0
}

export async function setRenderRun(
  db: Database,
  renderId: string,
  runId: string | null
) {
  await db
    .update(videoRenders)
    .set({ workflowRunId: runId })
    .where(eq(videoRenders.id, renderId))
}

export async function getRenderJob(db: Database, renderId: string) {
  const [row] = await db
    .select({ render: videoRenders, order: videoOrders, email: user.email })
    .from(videoRenders)
    .innerJoin(videoOrders, eq(videoOrders.id, videoRenders.orderId))
    .innerJoin(user, eq(user.id, videoOrders.userId))
    .where(eq(videoRenders.id, renderId))
  return row ?? null
}

export async function markRenderRendering(db: Database, renderId: string) {
  await db
    .update(videoRenders)
    .set({ status: 'rendering', startedAt: sql`now()`, error: null })
    .where(eq(videoRenders.id, renderId))
}

export async function markRenderReady(
  db: Database,
  renderId: string,
  files: VideoFile[]
): Promise<VideoFile[]> {
  return db.transaction(async (tx) => {
    const [render] = await tx
      .update(videoRenders)
      .set({ status: 'ready', files, finishedAt: sql`now()`, error: null })
      .where(eq(videoRenders.id, renderId))
      .returning({
        orderId: videoRenders.orderId,
        version: videoRenders.version,
      })
    if (!render) return []

    const olderVersions = and(
      eq(videoRenders.orderId, render.orderId),
      lt(videoRenders.version, render.version)
    )
    const older = await tx
      .select({ files: videoRenders.files })
      .from(videoRenders)
      .where(olderVersions)
    await tx.update(videoRenders).set({ files: null }).where(olderVersions)
    return older.flatMap((row) => row.files ?? [])
  })
}

export async function markRenderFailed(
  db: Database,
  renderId: string,
  error: string
) {
  await db
    .update(videoRenders)
    .set({ status: 'failed', error, finishedAt: sql`now()` })
    .where(eq(videoRenders.id, renderId))
}

export async function resetRenderForRetry(db: Database, renderId: string) {
  const reset = await db
    .update(videoRenders)
    .set({ status: 'queued', workflowRunId: null, error: null })
    .where(
      and(eq(videoRenders.id, renderId), eq(videoRenders.status, 'failed'))
    )
    .returning({ id: videoRenders.id })
  return reset.length > 0
}

export type UpdateResult =
  | { ok: true; render: VideoRender; order: VideoOrder }
  | {
      ok: false
      reason:
        | 'not-found'
        | 'not-paid'
        | 'busy'
        | 'unchanged'
        | 'no-updates-left'
        | 'too-different'
    }

export async function createUpdate(
  db: Database,
  input: { userId: string; orderId: string; data: VideoRenderData }
): Promise<UpdateResult> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(videoOrders)
      .where(
        and(
          eq(videoOrders.id, input.orderId),
          eq(videoOrders.userId, input.userId)
        )
      )
      .for('update')
    if (!order) return { ok: false, reason: 'not-found' }
    if (order.status !== 'paid') return { ok: false, reason: 'not-paid' }

    const renders = await tx
      .select()
      .from(videoRenders)
      .where(eq(videoRenders.orderId, order.id))
      .orderBy(videoRenders.version)
    if (renders.some((render) => ACTIVE_RENDER.has(render.status))) {
      return { ok: false, reason: 'busy' }
    }
    const data: VideoRenderData = {
      days: daysInPeriod(input.data.days, periodOf(order)),
      weekStartsOn: input.data.weekStartsOn,
    }
    const ready = renders.findLast((render) => render.status === 'ready')
    if (ready && sameRenderData(ready.data, data)) {
      return { ok: false, reason: 'unchanged' }
    }
    const first = renders.find((render) => render.version === 0)
    if (first && !keepsEnoughDays(first.data.days, data.days)) {
      return { ok: false, reason: 'too-different' }
    }

    const latest = renders.at(-1)
    if (latest?.status === 'failed') {
      const [render] = await tx
        .update(videoRenders)
        .set({
          data,
          status: 'queued',
          workflowRunId: null,
          files: null,
          error: null,
          startedAt: null,
          finishedAt: null,
        })
        .where(eq(videoRenders.id, latest.id))
        .returning()
      return { ok: true, render, order }
    }

    const version = (latest?.version ?? 0) + 1
    if (version > MAX_UPDATES) return { ok: false, reason: 'no-updates-left' }

    const [render] = await tx
      .insert(videoRenders)
      .values({
        id: randomUUID(),
        orderId: order.id,
        version,
        data,
        status: 'queued',
      })
      .returning()
    return { ok: true, render, order }
  })
}

function sameRenderData(a: VideoRenderData, b: VideoRenderData): boolean {
  return a.weekStartsOn === b.weekStartsOn && sameCalendarDays(a.days, b.days)
}

export function updatesUsed(renders: Pick<VideoRender, 'version'>[]): number {
  return Math.max(0, ...renders.map((render) => render.version))
}

export async function getOrderForUser(
  db: Database,
  userId: string,
  orderId: string
) {
  const [order] = await db
    .select()
    .from(videoOrders)
    .where(and(eq(videoOrders.id, orderId), eq(videoOrders.userId, userId)))
  if (!order) return null
  const renders = await db
    .select()
    .from(videoRenders)
    .where(eq(videoRenders.orderId, orderId))
    .orderBy(videoRenders.version)
  return { order, renders }
}

export async function listOrdersForUser(db: Database, userId: string) {
  const orders = await db
    .select()
    .from(videoOrders)
    .where(
      and(eq(videoOrders.userId, userId), inArray(videoOrders.status, ['paid']))
    )
    .orderBy(desc(videoOrders.createdAt))
  if (orders.length === 0) return []
  const renders = await db
    .select()
    .from(videoRenders)
    .where(
      inArray(
        videoRenders.orderId,
        orders.map((order) => order.id)
      )
    )
    .orderBy(videoRenders.version)
  return orders.map((order) => ({
    order,
    renders: renders.filter((render) => render.orderId === order.id),
  }))
}

export async function listUserVideoFiles(
  db: Database,
  userId: string
): Promise<VideoFile[]> {
  const rows = await db
    .select({ files: videoRenders.files })
    .from(videoRenders)
    .innerJoin(videoOrders, eq(videoOrders.id, videoRenders.orderId))
    .where(eq(videoOrders.userId, userId))
  return rows.flatMap((row) => row.files ?? [])
}
