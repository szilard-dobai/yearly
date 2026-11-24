import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { user } from './auth-schema'

export * from './auth-schema'

export const rateLimits = pgTable('rate_limit', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
})

export const calendars = pgTable('calendar', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  days: jsonb('days').$type<Record<string, string[]>>().notNull(),
  version: integer('version').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type VideoPack = 'year' | 'month'
export type VideoOrderSource = 'polar' | 'credit'
export type VideoOrderStatus = 'draft' | 'paid' | 'refunded'
export type VideoRenderStatus = 'queued' | 'rendering' | 'ready' | 'failed'

export type VideoRenderData = {
  days: Record<string, string[]>
  weekStartsOn: number
}

export type VideoFile = {
  kind: 'year' | 'stats' | 'month'
  theme: 'dark' | 'light'
  pathname: string
  bytes: number
  posterPathname?: string
}

export const videoOrders = pgTable(
  'video_order',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    pack: text('pack').$type<VideoPack>().notNull(),
    year: integer('year').notNull(),
    month: integer('month'),
    source: text('source').$type<VideoOrderSource>().notNull(),
    status: text('status').$type<VideoOrderStatus>().notNull(),
    polarCheckoutId: text('polar_checkout_id'),
    polarOrderId: text('polar_order_id').unique(),
    amountCents: integer('amount_cents'),
    currency: text('currency'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
  },
  (table) => [index('video_order_user_idx').on(table.userId)]
)

export const videoRenders = pgTable(
  'video_render',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => videoOrders.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    data: jsonb('data').$type<VideoRenderData>().notNull(),
    status: text('status').$type<VideoRenderStatus>().notNull(),
    workflowRunId: text('workflow_run_id'),
    files: jsonb('files').$type<VideoFile[]>(),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (table) => [unique('video_render_version').on(table.orderId, table.version)]
)

export const videoCredits = pgTable('video_credit', {
  email: text('email').primaryKey(),
  source: text('source').$type<'waitlist'>().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})
