import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
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
