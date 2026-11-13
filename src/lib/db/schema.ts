import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export * from './auth-schema'

export const rateLimits = pgTable('rate_limit', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
})
