import type { Database } from '@/lib/db'
import {
  user,
  videoCredits,
  videoOrders,
  videoRenders,
  type VideoOrderSource,
  type VideoOrderStatus,
  type VideoPack,
  type VideoRenderStatus,
} from '@/lib/db/schema'
import { alias } from 'drizzle-orm/pg-core'
import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  notExists,
  sql,
} from 'drizzle-orm'
import { resetRenderForRetry } from './orders'
import { getPolarOrderUrl } from './polar'

export const ADMIN_ORDERS_PAGE_SIZE = 50

export type AdminVideoTotals = {
  paidOrders: number
  freeOrders: number
  refundedOrders: number
  revenue: { currency: string; amountCents: number }[]
  failedRenders: number
  activeRenders: number
  creditsLeft: number
}

export type AdminVideoRender = {
  version: number
  status: VideoRenderStatus
  error: string | null
  finishedAt: string | null
}

export type AdminVideoOrder = {
  id: string
  createdAt: string
  email: string
  pack: VideoPack
  year: number
  month: number | null
  source: VideoOrderSource
  status: VideoOrderStatus
  amountCents: number | null
  currency: string | null
  polarOrderUrl: string | null
  updatesUsed: number
  render: AdminVideoRender | null
}

const FINISHED: ReadonlySet<VideoRenderStatus> = new Set(['ready', 'failed'])

const newerRender = alias(videoRenders, 'newer_render')

function isLatestRender(db: Database) {
  return notExists(
    db
      .select({ id: newerRender.id })
      .from(newerRender)
      .where(
        and(
          eq(newerRender.orderId, videoRenders.orderId),
          gt(newerRender.version, videoRenders.version)
        )
      )
  )
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

export async function getAdminVideoTotals(
  db: Database
): Promise<AdminVideoTotals> {
  const [orderCounts, revenue, [failed], [active], [credits]] =
    await Promise.all([
      db
        .select({
          source: videoOrders.source,
          status: videoOrders.status,
          n: count(),
        })
        .from(videoOrders)
        .groupBy(videoOrders.source, videoOrders.status),
      db
        .select({
          currency: videoOrders.currency,
          amountCents: sql<number>`sum(${videoOrders.amountCents})`.mapWith(
            Number
          ),
        })
        .from(videoOrders)
        .where(
          and(
            eq(videoOrders.source, 'polar'),
            eq(videoOrders.status, 'paid'),
            isNotNull(videoOrders.amountCents),
            isNotNull(videoOrders.currency)
          )
        )
        .groupBy(videoOrders.currency)
        .orderBy(videoOrders.currency),
      db
        .select({ n: count() })
        .from(videoRenders)
        .innerJoin(videoOrders, eq(videoOrders.id, videoRenders.orderId))
        .where(
          and(
            eq(videoOrders.status, 'paid'),
            eq(videoRenders.status, 'failed'),
            isLatestRender(db)
          )
        ),
      db
        .select({ n: count() })
        .from(videoRenders)
        .innerJoin(videoOrders, eq(videoOrders.id, videoRenders.orderId))
        .where(
          and(
            eq(videoOrders.status, 'paid'),
            inArray(videoRenders.status, ['queued', 'rendering'])
          )
        ),
      db
        .select({ n: count() })
        .from(videoCredits)
        .where(gt(videoCredits.expiresAt, sql`now()`)),
    ])

  const countOrders = (
    match: (row: {
      source: VideoOrderSource
      status: VideoOrderStatus
    }) => boolean
  ) => orderCounts.filter(match).reduce((total, row) => total + row.n, 0)

  return {
    paidOrders: countOrders(
      (row) => row.source === 'polar' && row.status === 'paid'
    ),
    freeOrders: countOrders(
      (row) => row.source === 'credit' && row.status === 'paid'
    ),
    refundedOrders: countOrders((row) => row.status === 'refunded'),
    revenue: revenue.map((row) => ({
      currency: row.currency ?? '',
      amountCents: row.amountCents,
    })),
    failedRenders: failed.n,
    activeRenders: active.n,
    creditsLeft: credits.n,
  }
}

export async function listAdminVideoOrders(
  db: Database,
  { offset = 0, limit = ADMIN_ORDERS_PAGE_SIZE } = {}
): Promise<{ orders: AdminVideoOrder[]; hasMore: boolean }> {
  const rows = await db
    .select({
      id: videoOrders.id,
      createdAt: videoOrders.createdAt,
      email: user.email,
      pack: videoOrders.pack,
      year: videoOrders.year,
      month: videoOrders.month,
      source: videoOrders.source,
      status: videoOrders.status,
      amountCents: videoOrders.amountCents,
      currency: videoOrders.currency,
      polarOrderId: videoOrders.polarOrderId,
    })
    .from(videoOrders)
    .innerJoin(user, eq(user.id, videoOrders.userId))
    .orderBy(desc(videoOrders.createdAt), desc(videoOrders.id))
    .limit(limit + 1)
    .offset(offset)

  const page = rows.slice(0, limit)
  const renders = page.length
    ? await db
        .select({
          orderId: videoRenders.orderId,
          version: videoRenders.version,
          status: videoRenders.status,
          error: videoRenders.error,
          finishedAt: videoRenders.finishedAt,
        })
        .from(videoRenders)
        .where(
          inArray(
            videoRenders.orderId,
            page.map((row) => row.id)
          )
        )
        .orderBy(videoRenders.version)
    : []

  const orders = page.map(({ polarOrderId, ...order }): AdminVideoOrder => {
    const latest = renders.findLast((render) => render.orderId === order.id)
    return {
      ...order,
      createdAt: order.createdAt.toISOString(),
      polarOrderUrl: polarOrderId ? getPolarOrderUrl(polarOrderId) : null,
      updatesUsed: latest?.version ?? 0,
      render: latest
        ? {
            version: latest.version,
            status: latest.status,
            error: latest.error,
            finishedAt: FINISHED.has(latest.status)
              ? toIso(latest.finishedAt)
              : null,
          }
        : null,
    }
  })

  return { orders, hasMore: rows.length > limit }
}

export type RetryResult =
  | { ok: true; renderId: string; pack: VideoPack }
  | { ok: false; reason: 'not-found' | 'not-failed' }

export async function queueFailedRenderAgain(
  db: Database,
  orderId: string
): Promise<RetryResult> {
  const [order] = await db
    .select({ status: videoOrders.status, pack: videoOrders.pack })
    .from(videoOrders)
    .where(eq(videoOrders.id, orderId))
  if (!order) return { ok: false, reason: 'not-found' }

  const [latest] = await db
    .select({ id: videoRenders.id, status: videoRenders.status })
    .from(videoRenders)
    .where(eq(videoRenders.orderId, orderId))
    .orderBy(desc(videoRenders.version))
    .limit(1)
  if (
    order.status !== 'paid' ||
    latest?.status !== 'failed' ||
    !(await resetRenderForRetry(db, latest.id))
  ) {
    return { ok: false, reason: 'not-failed' }
  }
  return { ok: true, renderId: latest.id, pack: order.pack }
}
